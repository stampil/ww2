<?php

declare(strict_types=1);

namespace Ww2\Squadron;

/**
 * What an aircraft is for: fighters win air combats, bombers hit the ground.
 */
enum AircraftCategory: string
{
    case Fighter = 'fighter';
    case Bomber = 'bomber';
}
