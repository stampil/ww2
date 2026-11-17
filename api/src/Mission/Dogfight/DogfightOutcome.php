<?php

declare(strict_types=1);

namespace Ww2\Mission\Dogfight;

/**
 * How a dogfight ends for the player: the enemy is shot down, or it gets away.
 */
enum DogfightOutcome: string
{
    case Won = 'won';
    case Escaped = 'escaped';
}
