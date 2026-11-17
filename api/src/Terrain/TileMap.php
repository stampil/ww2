<?php

declare(strict_types=1);

namespace Ww2\Terrain;

/**
 * The airfield as a grid of tiles, with the seed that made it and where its runway lies.
 */
final readonly class TileMap
{
    public function __construct(public int $seed, public Runway $runway, public TileGrid $grid)
    {
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return ['seed' => $this->seed, 'runway' => $this->runway->toArray(), ...$this->grid->toArray()];
    }
}
