<?php

declare(strict_types=1);

namespace Ww2\Base;

/**
 * The modules of an aircraft that the workshop makes; the value is the name of the part for the front.
 */
enum SparePart: string
{
    case Engine = 'engine';
    case Wings = 'wings';
    case Fuselage = 'fuselage';
    case Armament = 'armament';

    public function materialCost(): int
    {
        return match ($this) {
            self::Engine => 80,
            self::Wings => 60,
            self::Fuselage => 70,
            self::Armament => 40,
        };
    }

    public function seconds(): int
    {
        return match ($this) {
            self::Engine => 120,
            self::Wings => 90,
            self::Fuselage => 100,
            self::Armament => 60,
        };
    }
}
