<?php

declare(strict_types=1);

namespace Ww2\Terrain;

use Random\Engine\Xoshiro256StarStar;
use Random\Randomizer;

/**
 * Makes an airfield from a seed: a straight runway whose middle tiles may each have an exit, taxiways, then grass and bushes.
 * Every tile touches its neighbours with the same edge kind, so any seed gives a valid terrain.
 */
final class TerrainGenerator
{
    private const COLUMNS = 14;
    private const ROWS = 9;
    private const RUNWAY_ROW = 4;
    private const RUNWAY_FIRST_COLUMN = 2;
    private const RUNWAY_LENGTH = 4;
    private const MIN_TAXIWAY_CELLS = 2;
    private const MAX_TAXIWAY_CELLS = 4;
    private const MIN_LATERAL_CELLS = 1;
    private const MAX_LATERAL_CELLS = 2;
    private const MIN_BUSHES = 4;
    private const MAX_BUSHES = 8;
    private const PERCENT = 100;
    private const EXIT_PERCENT = 50;
    private const CROSSING_PERCENT = 30;
    private const LATERAL_BRANCH_PERCENT = 50;
    private const END_APRON_PERCENT = 50;

    public function generate(int $seed): TileMap
    {
        $random = new Randomizer(new Xoshiro256StarStar($seed));
        $runway = new Runway(self::RUNWAY_ROW, self::RUNWAY_FIRST_COLUMN, self::RUNWAY_LENGTH);
        $network = $this->layTaxiways($random, $runway);

        $tiles = [];
        for ($row = 0; $row < self::ROWS; $row += 1) {
            $tiles[] = [];
            for ($column = 0; $column < self::COLUMNS; $column += 1) {
                $tiles[$row][] = $this->tileAt($random, $runway, $network, $row, $column);
            }
        }

        return new TileMap($seed, $runway, new TileGrid($this->withBushes($random, $tiles)));
    }

    private function layTaxiways(Randomizer $random, Runway $runway): TaxiwayNetwork
    {
        $network = new TaxiwayNetwork();
        $innerColumns = range($runway->firstColumn + 1, $runway->lastColumn() - 1);
        $exitColumns = [];
        foreach ($innerColumns as $column) {
            if ($this->happens($random, self::EXIT_PERCENT)) {
                $exitColumns[] = $column;
            }
        }
        if ($exitColumns === []) {
            $exitColumns[] = $innerColumns[$random->getInt(0, count($innerColumns) - 1)];
        }
        foreach ($exitColumns as $column) {
            $outward = $random->getInt(0, 1) === 0 ? Side::North : Side::South;
            $this->layTaxiway($random, $network, $runway, $column, $outward);
            if ($this->happens($random, self::CROSSING_PERCENT)) {
                $this->layTaxiway($random, $network, $runway, $column, $outward->opposite());
            }
        }

        return $network;
    }

    /**
     * A taxiway straight out from the runway, perhaps with a branch at its tip turning east or west.
     */
    private function layTaxiway(Randomizer $random, TaxiwayNetwork $network, Runway $runway, int $column, Side $outward): void
    {
        $row = $runway->row;
        $cellsToLay = $random->getInt(self::MIN_TAXIWAY_CELLS, self::MAX_TAXIWAY_CELLS);
        for ($laid = 0; $laid < $cellsToLay; $laid += 1) {
            $network->link($row, $column, $outward);
            $row += $outward->rowStep();
        }
        $tipRow = $row;

        if ($this->happens($random, self::LATERAL_BRANCH_PERCENT)) {
            $lateral = $random->getInt(0, 1) === 0 ? Side::East : Side::West;
            $lateralCells = $random->getInt(self::MIN_LATERAL_CELLS, self::MAX_LATERAL_CELLS);
            $lateralColumn = $column;
            for ($laid = 0; $laid < $lateralCells && $this->isInside($tipRow, $lateralColumn + $lateral->columnStep()); $laid += 1) {
                $network->link($tipRow, $lateralColumn, $lateral);
                $lateralColumn += $lateral->columnStep();
            }
        }
    }

    private function tileAt(Randomizer $random, Runway $runway, TaxiwayNetwork $network, int $row, int $column): Tile
    {
        $isOnRunway = $runway->covers($row, $column);
        if (!$isOnRunway && !$network->crosses($row, $column)) {
            return new Tile(TileKind::Grass, 0);
        }

        $edges = [];
        foreach (Side::cases() as $side) {
            $edges[$side->value] = $this->edgeOn($runway, $network, $row, $column, $side);
        }

        return Tile::withEdges($edges, $isOnRunway ? $this->runwayKinds() : $this->taxiwayKinds($random));
    }

    private function edgeOn(Runway $runway, TaxiwayNetwork $network, int $row, int $column, Side $side): EdgeKind
    {
        if ($network->isLinked($row, $column, $side)) {
            return EdgeKind::Taxiway;
        }
        $continuesEast = $side === Side::East && $column < $runway->lastColumn();
        $continuesWest = $side === Side::West && $column > $runway->firstColumn;
        if ($runway->covers($row, $column) && ($continuesEast || $continuesWest)) {
            return EdgeKind::Runway;
        }

        return EdgeKind::Grass;
    }

    /**
     * @return list<TileKind>
     */
    private function runwayKinds(): array
    {
        return [TileKind::RunwayStraight, TileKind::RunwayEnd, TileKind::RunwayTaxiwayJunction, TileKind::RunwayTaxiwayCrossing];
    }

    /**
     * @return list<TileKind>
     */
    private function taxiwayKinds(Randomizer $random): array
    {
        $end = $this->happens($random, self::END_APRON_PERCENT) ? TileKind::TaxiwayEndApron : TileKind::TaxiwayEnd;

        return [TileKind::TaxiwayStraight, TileKind::TaxiwayCurve, TileKind::TaxiwayT, TileKind::TaxiwayCross, $end];
    }

    /**
     * @param list<list<Tile>> $tiles
     * @return list<list<Tile>>
     */
    private function withBushes(Randomizer $random, array $tiles): array
    {
        $grassCells = [];
        foreach ($tiles as $row => $rowTiles) {
            foreach ($rowTiles as $column => $tile) {
                if ($tile->kind === TileKind::Grass) {
                    $grassCells[] = [$row, $column];
                }
            }
        }
        $bushCount = $random->getInt(self::MIN_BUSHES, self::MAX_BUSHES);
        foreach ($random->pickArrayKeys($grassCells, $bushCount) as $cell) {
            [$row, $column] = $grassCells[$cell];
            $tiles[$row][$column] = new Tile(TileKind::Bushes, 0);
        }

        return $tiles;
    }

    private function happens(Randomizer $random, int $percent): bool
    {
        return $random->getInt(1, self::PERCENT) <= $percent;
    }

    private function isInside(int $row, int $column): bool
    {
        return $row >= 0 && $row < self::ROWS && $column >= 0 && $column < self::COLUMNS;
    }
}
