<?php

declare(strict_types=1);

namespace Ww2\Mission;

use Random\Randomizer;

/**
 * A span of whole numbers, both ends included, that a mission figure is drawn from.
 */
final readonly class IntegerRange
{
    public function __construct(public int $min, public int $max)
    {
    }

    public function draw(Randomizer $random): int
    {
        return $random->getInt($this->min, $this->max);
    }
}
