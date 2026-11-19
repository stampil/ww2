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
    public function buy(int $baseId, Stock $stock, int $quantity): void
    {
        if ($quantity < 1) {
            throw new BaseException(BaseError::InvalidQuantity);
        }
        $this->database->transaction(function () use ($baseId, $stock, $quantity): void {
            $resources = $this->bases->lockResources($baseId);
            $cost = $stock->unitPrice() * $quantity;
            if ($resources->supplies < $cost) {
                throw new BaseException(BaseError::InsufficientSupplies);
            }
            if ($resources->stock($stock) + $quantity > $this->capacityOf($baseId)) {
                throw new BaseException(BaseError::WarehouseFull);
            }
            $this->bases->buy($baseId, $stock, $quantity, $cost);
        });
    }

    /**
     * @return array{capacity: int, prices: array<string, int>}
     */
    public function describe(int $baseId): array
    {
        $prices = [];
        foreach (Stock::cases() as $stock) {
            $prices[$stock->value] = $stock->unitPrice();
        }

        return ['capacity' => $this->capacityOf($baseId), 'prices' => $prices];
    }

    public function capacityOf(int $baseId): int
    {
        return self::BASE_CAPACITY + self::CAPACITY_PER_LEVEL * $this->upgrades->levelOf($baseId, Upgrade::Warehouse);
    }
}
