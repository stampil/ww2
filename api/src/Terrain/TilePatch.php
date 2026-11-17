<?php

declare(strict_types=1);

namespace Ww2\Terrain;

/**
 * A small square of tiles drawn at random to test the look of tiles laid end to end, with the seed that made it.
 */
final readonly class TilePatch
{
    public function __construct(public int $seed, public TileGrid $grid)
    {
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return ['seed' => $this->seed, ...$this->grid->toArray()];
    }
}
