<?php

declare(strict_types=1);

namespace Ww2\Terrain;

use Random\Engine\Xoshiro256StarStar;
use Random\Randomizer;

/**
 * Draws a square of tiles at random, each in a random turn, that fit side by side: the sides that touch have the same
 * edge kind. A tile with no choice left sends the draw back to the tile before it.
 */
final class TilePatchGenerator
{
    private const COLUMNS = 4;
    private const ROWS = 4;
    private const QUARTER_TURNS = 4;

    /** @var list<Tile>|null the tiles in every turn that differ by their edges, made on first use */
    private ?array $distinctTiles = null;

    public function generate(int $seed): TilePatch
    {
        $placed = $this->fill(new Randomizer(new Xoshiro256StarStar($seed)), []);

        return new TilePatch($seed, new TileGrid(array_chunk($placed, self::COLUMNS)));
    }

    /**
     * @param list<Tile> $placed the tiles laid so far, row after row from the north-west
     * @return list<Tile>|null every tile of the square, or null when no tile fits after these ones
     */
    private function fill(Randomizer $random, array $placed): ?array
    {
        $index = count($placed);
        if ($index === self::COLUMNS * self::ROWS) {
            return $placed;
        }
        foreach ($random->shuffleArray($this->tilesFitting($placed, $index)) as $tile) {
            $completed = $this->fill($random, [...$placed, $tile]);
            if ($completed !== null) {
                return $completed;
            }
        }

        return null;
    }

    /**
     * @param list<Tile> $placed
     * @return list<Tile>
     */
    private function tilesFitting(array $placed, int $index): array
    {
        $north = $index >= self::COLUMNS ? $placed[$index - self::COLUMNS] : null;
        $west = $index % self::COLUMNS > 0 ? $placed[$index - 1] : null;
        $fitting = [];
        foreach ($this->distinctTiles() as $tile) {
            $fitsNorth = $north === null || $north->edgeOn(Side::South) === $tile->edgeOn(Side::North);
            $fitsWest = $west === null || $west->edgeOn(Side::East) === $tile->edgeOn(Side::West);
            if ($fitsNorth && $fitsWest) {
                $fitting[] = $tile;
            }
        }

        return $fitting;
    }

    /**
     * @return list<Tile>
     */
    private function distinctTiles(): array
    {
        if ($this->distinctTiles === null) {
            $bySignature = [];
            foreach (TileKind::cases() as $kind) {
                for ($quarterTurns = 0; $quarterTurns < self::QUARTER_TURNS; $quarterTurns += 1) {
                    $tile = new Tile($kind, $quarterTurns);
                    $bySignature[$kind->value . ':' . $this->edgeSignature($tile)] ??= $tile;
                }
            }
            $this->distinctTiles = array_values($bySignature);
        }

        return $this->distinctTiles;
    }

    private function edgeSignature(Tile $tile): string
    {
        return implode(',', array_map(static fn (Side $side): string => $tile->edgeOn($side)->value, Side::cases()));
    }
}
