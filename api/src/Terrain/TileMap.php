<?php

declare(strict_types=1);

namespace Ww2\Terrain;

/**
 * The terrain as a grid of tiles, rows from the north and columns from the west, with the seed that made it.
 */
final readonly class TileMap
{
    /**
     * @param list<list<Tile>> $tiles
     */
    public function __construct(public int $seed, public Runway $runway, public array $tiles)
    {
    }

    /**
     * @return array{seed: int, columns: int, rows: int, runway: array{row: int, firstColumn: int, length: int}, tiles: list<list<array{kind: string, quarterTurns: int}>>}
     */
    public function toArray(): array
    {
        return [
            'seed' => $this->seed,
            'columns' => count($this->tiles[0]),
            'rows' => count($this->tiles),
            'runway' => $this->runway->toArray(),
            'tiles' => array_map(
                static fn (array $row): array => array_map(static fn (Tile $tile): array => $tile->toArray(), $row),
                $this->tiles,
            ),
        ];
    }
}
