<?php

declare(strict_types=1);

namespace Ww2\Mission;

use Ww2\Squadron\AircraftCategory;

/**
 * What a type of mission looks like: the aircraft it takes, how long it lasts, what it burns, how risky it is, what it pays.
 * The fuel, the ammunition and the rewards are figures per aircraft; the supplies paid grow with the risk, by a figure per risk point.
 */
final readonly class MissionProfile
{
    /**
     * @param AircraftCategory|null $category the only category that can fly it, or null when any aircraft can
     */
    public function __construct(
        public ?AircraftCategory $category,
        public IntegerRange $aircraftCount,
        public IntegerRange $durationSeconds,
        public IntegerRange $fuelPerAircraft,
        public IntegerRange $ammunitionPerAircraft,
        public IntegerRange $risk,
        public IntegerRange $suppliesPerRiskPoint,
        public int $commandPointsPerAircraft,
    ) {
    }
}
