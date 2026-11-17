<?php

declare(strict_types=1);

namespace Ww2\Terrain;

/**
 * Tiles laid out in rows from the north and columns from the west.
 */
final readonly class TileGrid
{
    /**
     * @param list<list<Tile>> $tiles
     */
    public function __construct(public array $tiles)
    {
    }

    /**
     * @return array{columns: int, rows: int, tiles: list<list<array{kind: string, quarterTurns: int}>>}
     */
    public function toArray(): array
    {
        return [
            'columns' => count($this->tiles[0]),
            'rows' => count($this->tiles),
            'tiles' => array_map(
                static fn (array $row): array => array_map(static fn (Tile $tile): array => $tile->toArray(), $row),
                $this->tiles,
            ),
        ];
    }
}
