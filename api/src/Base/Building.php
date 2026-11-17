<?php

declare(strict_types=1);

namespace Ww2\Base;

/**
 * The four buildings of a base; the value is the name of the building for the front.
 */
enum Building: string
{
    case Headquarters = 'headquarters';
    case Workshop = 'workshop';
    case Warehouse = 'warehouse';
    case Hangar = 'hangar';
}
