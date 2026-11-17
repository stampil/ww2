<?php

declare(strict_types=1);

namespace Ww2\Base;

use Ww2\Database\Database;

/**
 * The warehouse: stocks of fuel, ammunition and materials, bought with supplies, up to a capacity that the upgrades raise.
 */
final class Warehouse
{
    private const BASE_CAPACITY = 1000;
    private const CAPACITY_PER_LEVEL = 500;

    public function __construct(
        private readonly Database $database,
        private readonly BaseStore $bases,
        private readonly Upgrades $upgrades,
    ) {
    }

    /**
     * @throws BaseException when the quantity is not positive, the supplies run short or the stock would overflow
     */
    public function buy(int $playerId, Stock $stock, int $quantity): void
    {
        if ($quantity < 1) {
            throw new BaseException(BaseError::InvalidQuantity);
        }
        $this->database->transaction(function () use ($playerId, $stock, $quantity): void {
            $resources = $this->bases->lockResources($playerId);
            $cost = $stock->unitPrice() * $quantity;
            if ($resources->supplies < $cost) {
                throw new BaseException(BaseError::InsufficientSupplies);
            }
            if ($resources->stock($stock) + $quantity > $this->capacityOf($playerId)) {
                throw new BaseException(BaseError::WarehouseFull);
            }
            $this->bases->buy($playerId, $stock, $quantity, $cost);
        });
    }

    /**
     * @return array{capacity: int, prices: array<string, int>}
     */
    public function describe(int $playerId): array
    {
        $prices = [];
        foreach (Stock::cases() as $stock) {
            $prices[$stock->value] = $stock->unitPrice();
        }

        return ['capacity' => $this->capacityOf($playerId), 'prices' => $prices];
    }

    private function capacityOf(int $playerId): int
    {
        return self::BASE_CAPACITY + self::CAPACITY_PER_LEVEL * $this->upgrades->levelOf($playerId, Upgrade::Warehouse);
    }
}
