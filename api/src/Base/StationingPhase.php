<?php

declare(strict_types=1);

namespace Ww2\Base;

/**
 * Where a stationed aircraft stands: flying out to the camp, standing there until it is recalled, or flying back; the value is the name of the phase for the front.
 */
enum StationingPhase: string
{
    case Outbound = 'outbound';
    case Stationed = 'stationed';
    case Returning = 'returning';
}
