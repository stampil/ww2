<?php

declare(strict_types=1);

namespace Ww2\Mission;

use Random\Randomizer;

/**
 * Draws a new mission: a type at random, then each figure within the range of that type.
 */
final class MissionGenerator
{
    public function __construct(private readonly Randomizer $random = new Randomizer())
    {
    }

    public function draw(): Mission
    {
        $types = MissionType::cases();
        $type = $types[$this->random->getInt(0, count($types) - 1)];
        $profile = $type->profile();
        $aircraftCount = $profile->aircraftCount->draw($this->random);

        return new Mission(
            0,
            $type,
            $aircraftCount,
            $profile->durationSeconds->draw($this->random),
            $profile->fuelPerAircraft->draw($this->random),
            $profile->ammunitionPerAircraft->draw($this->random),
            $profile->risk->draw($this->random),
            $profile->suppliesPerAircraft->draw($this->random) * $aircraftCount,
            $profile->commandPointsPerAircraft * $aircraftCount,
        );
    }
}
