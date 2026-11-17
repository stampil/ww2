<?php

declare(strict_types=1);

namespace Ww2\Terrain;

/**
 * One of the four sides of a tile, clockwise from the north. Row numbers grow toward the south, column numbers toward the east.
 */
enum Side: int
{
    case North = 0;
    case East = 1;
    case South = 2;
    case West = 3;

    private const SIDE_COUNT = 4;
    private const HALF_TURN = 2;

    public function turnedBy(int $quarterTurns): self
    {
        $turned = ($this->value + $quarterTurns) % self::SIDE_COUNT;

        return self::from($turned < 0 ? $turned + self::SIDE_COUNT : $turned);
    }

    public function opposite(): self
    {
        return $this->turnedBy(self::HALF_TURN);
    }

    public function rowStep(): int
    {
        return match ($this) {
            self::North => -1,
            self::South => 1,
            self::East, self::West => 0,
        };
    }

    public function columnStep(): int
    {
        return match ($this) {
            self::East => 1,
            self::West => -1,
            self::North, self::South => 0,
        };
    }
}
