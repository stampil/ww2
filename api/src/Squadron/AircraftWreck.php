<?php

declare(strict_types=1);

namespace Ww2\Squadron;

use Ww2\Clock\ParisCalendar;

/**
 * An aircraft that was destroyed: it keeps its place in the hangar, its number, its livery and the day it was made, until it is rebuilt.
 */
final readonly class AircraftWreck
{
    public function __construct(public int $id, public AircraftModel $model, public Livery $livery, public int $number, public int $commissionedEpoch)
    {
    }

    public function serviceDays(int $nowEpoch): int
    {
        return ParisCalendar::daysBetween($this->commissionedEpoch, $nowEpoch);
    }
}
