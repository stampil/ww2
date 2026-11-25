<?php

declare(strict_types=1);

namespace Ww2\Base;

use Ww2\Mission\Dogfight\DogfightOutcome;

/**
 * How the combats of a capture went: how many defenders the camp had, how many the attackers shot down, and which aircraft lost a combat.
 */
final readonly class CaptureFight
{
    /**
     * @param list<int> $lostAircraftIds the aircraft that lost a combat, and are lost
     */
    public function __construct(public int $defenders, public int $kills, public array $lostAircraftIds)
    {
    }

    /** Whether no defender is left. */
    public function hasWon(): bool
    {
        return $this->kills >= $this->defenders;
    }

    /** How the capture ended for each aircraft that flew it: won if the camp is taken, whatever its own combats. */
    public function outcome(): DogfightOutcome
    {
        return $this->hasWon() ? DogfightOutcome::Won : DogfightOutcome::Escaped;
    }
}
