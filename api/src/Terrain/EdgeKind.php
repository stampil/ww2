<?php

declare(strict_types=1);

namespace Ww2\Terrain;

/**
 * What crosses the side of a tile. Two tiles fit side by side when the sides that touch have the same kind.
 */
enum EdgeKind: string
{
    case Grass = 'grass';
    case Taxiway = 'taxiway';
    case Runway = 'runway';
}
