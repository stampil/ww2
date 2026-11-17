<?php

declare(strict_types=1);

namespace Ww2\Mission;

/**
 * The mini-games a flight can call the player to; the value is the name of the kind for the front.
 */
enum AlertKind: string
{
    case Dogfight = 'dogfight';
    case Cockpit = 'cockpit';
}
