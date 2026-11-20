<?php

declare(strict_types=1);

namespace Ww2\Base;

/**
 * An aircraft and its pilot sent to another base of the world: what is still in its hold, when it lands there, and when it is home again, which is known from the start for a supply flight and once recalled for the others.
 */
final readonly class Stationing
{
    public function __construct(
        public int $aircraftId,
        public int $pilotId,
        public int $originBaseId,
        public int $destinationBaseId,
        public Cargo $cargo,
        public int $landsGameSecond,
        public ?int $returnsGameSecond,
    ) {
    }

    public function phaseAt(int $gameSeconds): StationingPhase
    {
        if ($gameSeconds < $this->landsGameSecond) {
            return StationingPhase::Outbound;
        }

        return $this->returnsGameSecond === null ? StationingPhase::Stationed : StationingPhase::Returning;
    }

    /**
     * @return int the game seconds before the aircraft lands, or before it is home again; none while it stands at the camp
     */
    public function remainingSecondsAt(int $gameSeconds): int
    {
        $arrival = $this->phaseAt($gameSeconds) === StationingPhase::Returning ? $this->returnsGameSecond : $this->landsGameSecond;

        return max(0, $arrival - $gameSeconds);
    }
}
