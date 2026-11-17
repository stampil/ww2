<?php

declare(strict_types=1);

namespace Ww2\Base;

/**
 * What the command points buy for a building; the value is the name of the building for the front.
 */
enum Upgrade: string
{
    case Hangar = 'hangar';
    case Workshop = 'workshop';
    case Warehouse = 'warehouse';
}
