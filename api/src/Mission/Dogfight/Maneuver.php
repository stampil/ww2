<?php

declare(strict_types=1);

namespace Ww2\Mission\Dogfight;

/**
 * The maneuvers an aircraft can play in a dogfight: the three cards of the D.520 (accelerate, tight turn, slip), the last two to either side.
 */
enum Maneuver: string
{
    case Accelerate = 'accelerate';
    case TurnLeft = 'turnLeft';
    case TurnRight = 'turnRight';
    case SlipLeft = 'slipLeft';
    case SlipRight = 'slipRight';
}
