<?php

declare(strict_types=1);

namespace Ww2\Terrain;

use LogicException;

/**
 * A tile of the terrain, turned clockwise by a number of quarter turns.
 */
final readonly class Tile
{
    private const QUARTER_TURNS = 4;

    public function __construct(public TileKind $kind, public int $quarterTurns)
    {
    }

    public function edgeOn(Side $side): EdgeKind
    {
        return $this->kind->edges()[$side->turnedBy(-$this->quarterTurns)->value];
    }

    /**
     * Finds the tile, among these kinds and in any turn, whose edges are exactly these ones.
     *
     * @param array<int, EdgeKind> $edgesBySide the edge kinds indexed by the value of the side
     * @param list<TileKind> $kinds
     * @throws LogicException when no tile has these edges
     */
    public static function withEdges(array $edgesBySide, array $kinds): self
    {
        foreach ($kinds as $kind) {
            for ($quarterTurns = 0; $quarterTurns < self::QUARTER_TURNS; $quarterTurns += 1) {
                $tile = new self($kind, $quarterTurns);
                if (self::hasEdges($tile, $edgesBySide)) {
                    return $tile;
                }
            }
        }

        throw new LogicException('No tile has the edges asked for.');
    }

    /**
     * @return array{kind: string, quarterTurns: int}
     */
    public function toArray(): array
    {
        return ['kind' => $this->kind->value, 'quarterTurns' => $this->quarterTurns];
    }

    /**
     * @param array<int, EdgeKind> $edgesBySide
     */
    private static function hasEdges(self $tile, array $edgesBySide): bool
    {
        foreach (Side::cases() as $side) {
            if ($tile->edgeOn($side) !== $edgesBySide[$side->value]) {
                return false;
            }
        }

        return true;
    }
}
