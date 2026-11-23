<?php

declare(strict_types=1);

namespace Ww2\Squadron;

/**
 * The paint an aircraft of a player wears: the French D.520 of the Allies, the German one of the Axe; the value is the name of the livery for the front.
 */
enum Livery: string
{
    case French = 'french';
    case German = 'german';
}
