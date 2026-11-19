<?php

declare(strict_types=1);

namespace Ww2\Base;

use Ww2\Clock\GameClock;
use Ww2\Clock\GameClockStore;
use Ww2\Database\Database;
use Ww2\World\Bases;

/**
 * The automatic merchant of the free camps, which the AI runs: each holds a stock of fuel, ammunition and materials that a player buys with supplies, or sells to it for supplies.
 * The dearer a stock is the scarcer it is at the camp; the camp sells a little above its price and buys a little below, and its stock drifts back to a base level as the game goes on. The figures are mine.
 */
final class Merchant
{
    /** The stock a camp comes back to, and the most it can hold. */
    public const BASE_LEVEL = 500;
    public const CAPACITY = 1000;
    /** How much of the gap to the base level a camp closes in a game minute, at most. */
    public const REGAINED_PER_MINUTE = 10;
    /** What a camp adds to its price when it sells, and takes off when it buys, in percent. */
    public const SPREAD_PERCENT = 10;
    /** The most a player buys or sells at once. */
    public const MAX_TRADE = 100;
    private const SECONDS_PER_MINUTE = 60;
    private const PERCENT = 100;
    private const PRICE_FACTOR_PERCENT = ['most' => 200, 'least' => 50];

    public function __construct(
        private readonly Database $database,
        private readonly BaseStore $baseStore,
        private readonly Warehouse $warehouse,
        private readonly Bases $bases,
        private readonly GameClockStore $clocks,
    ) {
    }

    /**
     * The free camps of the world of a base, with each stock they hold now and what one unit would cost to buy and bring in to sell.
     *
     * @param GameClock $clock the clock of the base, read once for the whole answer
     * @return array{maxTrade: int, camps: list<array{baseId: int, site: string, stocks: array<string, array{quantity: int, buyPrice: float, sellPrice: float}>}>}
     */
    public function describe(int $baseId, GameClock $clock): array
    {
        $camps = [];
        foreach ($this->bases->campsOf($this->bases->instanceOf($baseId)) as $camp) {
            if ($camp['holderId'] !== null) {
                continue;
            }
            $stocks = [];
            foreach (Stock::cases() as $stock) {
                $quantity = $this->quantityAt($camp['id'], $stock, $clock->gameSeconds);
                $stocks[$stock->value] = [
                    'quantity' => $quantity,
                    'buyPrice' => round($stock->unitPrice() * $this->factorPercent($quantity) * (self::PERCENT + self::SPREAD_PERCENT) / (self::PERCENT * self::PERCENT), 2),
                    'sellPrice' => round($stock->unitPrice() * $this->factorPercent($quantity) * (self::PERCENT - self::SPREAD_PERCENT) / (self::PERCENT * self::PERCENT), 2),
                ];
            }
            $camps[] = ['baseId' => $camp['id'], 'site' => $this->bases->siteOf($camp['id'])->value, 'stocks' => $stocks];
        }

        return ['maxTrade' => self::MAX_TRADE, 'camps' => $camps];
    }

    /**
     * Buys a quantity of a stock from a free camp with supplies.
     *
     * @throws BaseException when the quantity is not from 1 to the most, the camp is not a free camp of the world, it holds less, the supplies run short or the warehouse would overflow
     */
    public function buy(int $baseId, int $campBaseId, Stock $stock, int $quantity): void
    {
        $this->trade($baseId, $campBaseId, $stock, $quantity, function (int $campQuantity) use ($baseId, $stock, $quantity): int {
            $resources = $this->baseStore->lockResources($baseId);
            $cost = intdiv($stock->unitPrice() * $this->factorPercent($campQuantity) * (self::PERCENT + self::SPREAD_PERCENT) * $quantity + self::PERCENT * self::PERCENT - 1, self::PERCENT * self::PERCENT);
            if ($campQuantity < $quantity) {
                throw new BaseException(BaseError::CampShortage);
            }
            if ($resources->supplies < $cost) {
                throw new BaseException(BaseError::InsufficientSupplies);
            }
            if ($resources->stock($stock) + $quantity > $this->warehouse->capacityOf($baseId)) {
                throw new BaseException(BaseError::WarehouseFull);
            }
            $this->baseStore->buy($baseId, $stock, $quantity, $cost);

            return $campQuantity - $quantity;
        });
    }

    /**
     * Sells a quantity of a stock to a free camp for supplies.
     *
     * @throws BaseException when the quantity is not from 1 to the most, the camp is not a free camp of the world, the base holds less, or the camp would hold more than it can
     */
    public function sell(int $baseId, int $campBaseId, Stock $stock, int $quantity): void
    {
        $this->trade($baseId, $campBaseId, $stock, $quantity, function (int $campQuantity) use ($baseId, $stock, $quantity): int {
            $resources = $this->baseStore->lockResources($baseId);
            $revenue = intdiv($stock->unitPrice() * $this->factorPercent($campQuantity) * (self::PERCENT - self::SPREAD_PERCENT) * $quantity, self::PERCENT * self::PERCENT);
            if ($resources->stock($stock) < $quantity) {
                throw new BaseException(Resource::from($stock->value)->shortage());
            }
            if ($campQuantity + $quantity > self::CAPACITY) {
                throw new BaseException(BaseError::RecipientWarehouseFull);
            }
            $this->baseStore->sell($baseId, $stock, $quantity, $revenue);

            return $campQuantity + $quantity;
        });
    }

    /**
     * Runs a trade under the locks of the camp and of its stock: the camp, which must be free in the world of the base, cannot be taken meanwhile.
     *
     * @param callable(int): int $carryOut given the stock of the camp now, makes the trade and returns the stock the camp is left with
     */
    private function trade(int $baseId, int $campBaseId, Stock $stock, int $quantity, callable $carryOut): void
    {
        if ($quantity < 1 || $quantity > self::MAX_TRADE) {
            throw new BaseException(BaseError::InvalidQuantity);
        }
        $this->database->transaction(function () use ($baseId, $campBaseId, $stock, $carryOut): void {
            if ($this->bases->instanceOf($campBaseId) !== $this->bases->instanceOf($baseId) || $this->bases->lockedHolderIdOf($campBaseId) !== null) {
                throw new BaseException(BaseError::InvalidRecipient);
            }
            $gameSeconds = $this->clocks->of($baseId)->gameSeconds;
            $this->database->execute(
                'INSERT INTO camp_stocks (base_id, stock, quantity, game_second) VALUES (:base_id, :stock, :quantity, :game_second) ON DUPLICATE KEY UPDATE base_id = base_id',
                ['base_id' => $campBaseId, 'stock' => $stock->value, 'quantity' => self::BASE_LEVEL, 'game_second' => $gameSeconds],
            );
            $campQuantity = $this->lockedQuantityAt($campBaseId, $stock, $gameSeconds);
            $left = $carryOut($campQuantity);
            $this->database->execute(
                'UPDATE camp_stocks SET quantity = :quantity, game_second = :game_second WHERE base_id = :base_id AND stock = :stock',
                ['quantity' => $left, 'game_second' => $gameSeconds, 'base_id' => $campBaseId, 'stock' => $stock->value],
            );
        });
    }

    private function quantityAt(int $campBaseId, Stock $stock, int $gameSeconds): int
    {
        $rows = $this->database->fetchAll('SELECT quantity, game_second FROM camp_stocks WHERE base_id = :base_id AND stock = :stock', ['base_id' => $campBaseId, 'stock' => $stock->value]);

        return $rows === [] ? self::BASE_LEVEL : $this->drifted((int) $rows[0]['quantity'], $gameSeconds - (int) $rows[0]['game_second']);
    }

    private function lockedQuantityAt(int $campBaseId, Stock $stock, int $gameSeconds): int
    {
        $rows = $this->database->fetchAll('SELECT quantity, game_second FROM camp_stocks WHERE base_id = :base_id AND stock = :stock FOR UPDATE', ['base_id' => $campBaseId, 'stock' => $stock->value]);

        return $this->drifted((int) $rows[0]['quantity'], $gameSeconds - (int) $rows[0]['game_second']);
    }

    /**
     * What a stock has become after some game seconds: it moves toward the base level, by at most the regained part of a minute.
     */
    private function drifted(int $quantity, int $elapsedSeconds): int
    {
        $moved = intdiv(self::REGAINED_PER_MINUTE * $elapsedSeconds, self::SECONDS_PER_MINUTE);
        $gap = self::BASE_LEVEL - $quantity;

        return $quantity + ($gap >= 0 ? min($gap, $moved) : max($gap, -$moved));
    }

    /**
     * The price of a stock in percent of its usual price: twice as dear when the camp has none, as cheap as half when it has plenty.
     */
    private function factorPercent(int $campQuantity): int
    {
        return max(self::PRICE_FACTOR_PERCENT['least'], min(self::PRICE_FACTOR_PERCENT['most'], self::PRICE_FACTOR_PERCENT['most'] - intdiv(self::PERCENT * $campQuantity, self::BASE_LEVEL)));
    }
}
