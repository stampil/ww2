<?php

declare(strict_types=1);

namespace Ww2\Base;

/**
 * What the warehouse keeps, bought with supplies; the value is the name of the resource for the front.
 */
enum Stock: string
{
    case Fuel = 'fuel';
    case Ammunition = 'ammunition';
    case Materials = 'materials';

    public function unitPrice(): int
    {
        return match ($this) {
            self::Fuel => 1,
            self::Ammunition => 2,
            self::Materials => 3,
        };
    }
}
