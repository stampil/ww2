<?php

declare(strict_types=1);

namespace Ww2\Base;

/**
 * How the battle of a base stands; the value is the name of the state for the front.
 */
enum BattleStatus: string
{
    case Ongoing = 'ongoing';
    case Won = 'won';
    case Lost = 'lost';
}
