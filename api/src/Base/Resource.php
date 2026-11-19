<?php

declare(strict_types=1);

namespace Ww2\Base;

/**
 * What one base can give another: its supplies, or one of the stocks of its warehouse; the value is the name of the resource for the front.
 */
enum Resource: string
{
    case Supplies = 'supplies';
    case Fuel = 'fuel';
    case Ammunition = 'ammunition';
    case Materials = 'materials';

    public function in(BaseResources $resources): int
    {
        return match ($this) {
            self::Supplies => $resources->supplies,
            self::Fuel => $resources->fuel,
            self::Ammunition => $resources->ammunition,
            self::Materials => $resources->materials,
        };
    }

    /**
     * @return Stock|null the stock of the warehouse it is, or null for the supplies, which no warehouse holds
     */
    public function stock(): ?Stock
    {
        return match ($this) {
            self::Supplies => null,
            self::Fuel => Stock::Fuel,
            self::Ammunition => Stock::Ammunition,
            self::Materials => Stock::Materials,
        };
    }

    public function shortage(): BaseError
    {
        return match ($this) {
            self::Supplies => BaseError::InsufficientSupplies,
            self::Fuel => BaseError::InsufficientFuel,
            self::Ammunition => BaseError::InsufficientAmmunition,
            self::Materials => BaseError::InsufficientMaterials,
        };
    }
}
