<?php

declare(strict_types=1);

namespace Ww2\Mission;

use Random\Randomizer;

/**
 * Draws a new mission: a type at random among those given, then each figure within the range of that type.
 */
final class MissionGenerator
{
    private const FULL_REWARD_PERCENT = 100;

    public function __construct(private readonly Randomizer $random = new Randomizer())
    {
    }

    /**
     * @param non-empty-list<MissionType> $types the types the mission may be of
     * @param int $rewardPercent how much of the drawn rewards the mission pays, rounded up
     */
    public function draw(array $types, int $rewardPercent = self::FULL_REWARD_PERCENT): Mission
    {
        $type = $types[$this->random->getInt(0, count($types) - 1)];
        $profile = $type->profile();
        $aircraftCount = $profile->aircraftCount->draw($this->random);
        $duration = $profile->durationSeconds->draw($this->random);
        $fuel = $profile->fuelPerAircraft->draw($this->random);
        $ammunition = $profile->ammunitionPerAircraft->draw($this->random);
        $risk = $profile->risk->draw($this->random);

        return new Mission(
            0,
            $type,
            $aircraftCount,
            $duration,
            $fuel,
            $ammunition,
            $risk,
            $this->scaled($profile->suppliesPerRiskPoint->draw($this->random) * $risk * $aircraftCount, $rewardPercent),
            $this->scaled($profile->commandPointsPerAircraft * $aircraftCount, $rewardPercent),
        );
    }

    private function scaled(int $reward, int $percent): int
    {
        return (int) ceil($reward * $percent / self::FULL_REWARD_PERCENT);
    }
}
