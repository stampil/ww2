<?php

declare(strict_types=1);

namespace Ww2\Squadron;

use Ww2\Mission\EnemyType;

/**
 * What a pilot has done: the missions flown and the ones that succeeded, the air combats fought, the victories over enemy aircraft, the ground attacks that succeeded and the aircraft lost.
 * The rank follows the missions that succeeded; the medals and the title of ace follow the victories, and the victories are kept by the type of the enemy.
 */
final readonly class PilotRecord
{
    public const FIRST_RANK = 1;
    /** The victories that make a pilot an ace. */
    public const ACE_VICTORIES = 5;
    /** The missions that must have succeeded to reach each rank after the first. */
    private const MISSIONS_FOR_RANK = [3, 6, 10, 15, 21];
    /** The victories that earn each medal, in the order the medals are given. */
    private const VICTORIES_FOR_MEDAL = [1, self::ACE_VICTORIES, 10];

    /**
     * @param array<string, int> $victoriesOver the victories over each type of enemy, by the name of the type; the victories of before the types were kept are in the total only
     */
    public function __construct(
        public int $missionsFlown = 0,
        public int $missionsSucceeded = 0,
        public int $airCombats = 0,
        public int $victories = 0,
        public int $groundSuccesses = 0,
        public int $aircraftLost = 0,
        public array $victoriesOver = [],
    ) {
    }

    /**
     * What one flight adds to the record of a pilot: a victory over the enemy they met for each air combat that succeeded.
     */
    public static function ofFlight(bool $airCombat, bool $groundStrike, bool $succeeded, bool $aircraftLost, EnemyType $enemy): self
    {
        $isVictory = $airCombat && $succeeded;

        return new self(
            missionsFlown: 1,
            missionsSucceeded: (int) $succeeded,
            airCombats: (int) $airCombat,
            victories: (int) $isVictory,
            groundSuccesses: (int) ($groundStrike && $succeeded),
            aircraftLost: (int) $aircraftLost,
            victoriesOver: $isVictory ? [$enemy->value => 1] : [],
        );
    }

    /**
     * @return int the rank the missions that succeeded give the pilot
     */
    public function meritRank(): int
    {
        $rank = self::FIRST_RANK;
        foreach (self::MISSIONS_FOR_RANK as $missions) {
            if ($this->missionsSucceeded >= $missions) {
                $rank += 1;
            }
        }

        return $rank;
    }

    /**
     * @return int how many medals the victories have earned
     */
    public function medals(): int
    {
        $medals = 0;
        foreach (self::VICTORIES_FOR_MEDAL as $victories) {
            if ($this->victories >= $victories) {
                $medals += 1;
            }
        }

        return $medals;
    }

    public function isAce(): bool
    {
        return $this->victories >= self::ACE_VICTORIES;
    }

    /**
     * @return array{missionsFlown: int, missionsSucceeded: int, airCombats: int, victories: int, groundSuccesses: int, aircraftLost: int, medals: int, isAce: bool, victoriesOver: list<array{enemy: string, victories: int}>}
     */
    public function toArray(): array
    {
        $victoriesOver = [];
        foreach ($this->victoriesOver as $enemy => $victories) {
            $victoriesOver[] = ['enemy' => $enemy, 'victories' => $victories];
        }

        return [
            'missionsFlown' => $this->missionsFlown,
            'missionsSucceeded' => $this->missionsSucceeded,
            'airCombats' => $this->airCombats,
            'victories' => $this->victories,
            'groundSuccesses' => $this->groundSuccesses,
            'aircraftLost' => $this->aircraftLost,
            'medals' => $this->medals(),
            'isAce' => $this->isAce(),
            'victoriesOver' => $victoriesOver,
        ];
    }
}
