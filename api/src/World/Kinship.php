<?php

declare(strict_types=1);

namespace Ww2\World;

/**
 * How another base stands to a player's base: one of the player's own, held by an ally of the same side, or free, held by nobody; the value is the name of the kinship for the front.
 */
enum Kinship: string
{
    case Own = 'own';
    case Ally = 'ally';
    case Free = 'free';
}
