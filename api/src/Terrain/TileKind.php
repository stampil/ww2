<?php

declare(strict_types=1);

namespace Ww2\Terrain;

/**
 * The tiles of the terrain, named as the front names them; the edges are those of the tile before any turn.
 */
enum TileKind: string
{
    case Grass = 'grass';
    case Bushes = 'bushes';
    case Apron = 'apron';
    case TaxiwayStraight = 'taxiwayStraight';
    case TaxiwayCurve = 'taxiwayCurve';
    case TaxiwayT = 'taxiwayT';
    case TaxiwayCross = 'taxiwayCross';
    case TaxiwayEnd = 'taxiwayEnd';
    case TaxiwayEndApron = 'taxiwayEndApron';
    case RunwayStraight = 'runwayStraight';
    case RunwayEnd = 'runwayEnd';
    case RunwayTaxiwayJunction = 'runwayTaxiwayJunction';
    case RunwayTaxiwayCrossing = 'runwayTaxiwayCrossing';

    /**
     * The edge kinds in the order north, east, south, west.
     *
     * @return array{EdgeKind, EdgeKind, EdgeKind, EdgeKind}
     */
    public function edges(): array
    {
        $grass = EdgeKind::Grass;
        $taxiway = EdgeKind::Taxiway;
        $runway = EdgeKind::Runway;

        return match ($this) {
            self::Grass, self::Bushes, self::Apron => [$grass, $grass, $grass, $grass],
            self::TaxiwayStraight => [$taxiway, $grass, $taxiway, $grass],
            self::TaxiwayCurve => [$taxiway, $taxiway, $grass, $grass],
            self::TaxiwayT => [$taxiway, $taxiway, $taxiway, $grass],
            self::TaxiwayCross => [$taxiway, $taxiway, $taxiway, $taxiway],
            self::TaxiwayEnd, self::TaxiwayEndApron => [$taxiway, $grass, $grass, $grass],
            self::RunwayStraight => [$grass, $runway, $grass, $runway],
            self::RunwayEnd => [$grass, $grass, $grass, $runway],
            self::RunwayTaxiwayJunction => [$grass, $runway, $taxiway, $runway],
            self::RunwayTaxiwayCrossing => [$taxiway, $runway, $taxiway, $runway],
        };
    }
}
