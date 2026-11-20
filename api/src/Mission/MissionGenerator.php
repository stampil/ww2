<?php

declare(strict_types=1);

namespace Ww2\Mission;

use Random\Randomizer;

/**
 * Draws a new mission: a type at random among those given, then each figure within the range of that type; a type that has them draws a rare ace mission now and then.
 */
final class MissionGenerator
{
    private const FULL_REWARD_PERCENT = 100;
    private const ACE_RISK = 3;
    /** What an ace mission pays on top of the supplies that its risk alone would pay. */
    private const ACE_REWARD_PERCENT = 150;

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
        $isAce = $profile->aceOneIn !== null && $this->random->getInt(1, $profile->aceOneIn) === 1;
        $risk = $isAce ? self::ACE_RISK : $profile->risk->draw($this->random);
        $supplies = $profile->suppliesPerRiskPoint->draw($this->random) * $risk * $aircraftCount;
        if ($isAce) {
            $supplies = $this->scaled($supplies, self::ACE_REWARD_PERCENT);
        }

        return new Mission(
            0,
            $type,
            $aircraftCount,
            $duration,
            $fuel,
            $ammunition,
            $risk,
            $this->scaled($supplies, $rewardPercent),
            $this->scaled($profile->commandPointsPerAircraft * $aircraftCount, $rewardPercent),
        );
    }

    private function scaled(int $reward, int $percent): int
    {
        return (int) ceil($reward * $percent / self::FULL_REWARD_PERCENT);
    }
}
