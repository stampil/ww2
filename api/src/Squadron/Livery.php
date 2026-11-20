<?php

declare(strict_types=1);

namespace Ww2\Squadron;

/**
 * The paint an aircraft wears; the value is the name of the livery for the front.
 */
enum Livery: string
{
    case French = 'french';
    case German = 'german';
    case Vichy = 'vichy';
}
