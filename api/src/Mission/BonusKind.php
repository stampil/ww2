<?php

declare(strict_types=1);

namespace Ww2\Mission;

/**
 * What a mini-game can do beside what the mission asks for, which pays on top of the mission: destroy a fuel dump or a tent beside the road of a strafing run, one of each in a run, or take a photo more than a reconnaissance requires.
 * The value is the name of the kind for the front, and for the table that keeps it.
 */
enum BonusKind: string
{
    case Tent = 'tent';
    case Barrels = 'barrels';
    case Photo = 'photo';

    /** What one of them destroyed pays, in supplies. */
    public function supplies(): int
    {
        return match ($this) {
            self::Tent => 15,
            self::Barrels => 10,
            self::Photo => 15,
        };
    }

    /** How many of them a run holds: a claim of more is not believed. */
    public function maxPerRun(): int
    {
        return match ($this) {
            self::Tent, self::Barrels => 1,
            self::Photo => 2,
        };
    }
}
