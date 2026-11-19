<?php

declare(strict_types=1);

namespace Ww2\Base;

/**
 * An aircraft and its pilot sent to another base of the world: the fuel and the ammunition still in its hold, when it lands there, and when it is home again once recalled.
 */
final readonly class Stationing
{
    public function __construct(
        public int $aircraftId,
        public int $pilotId,
        public int $originBaseId,
        public int $destinationBaseId,
        public int $fuel,
        public int $ammunition,
        public int $landsGameSecond,
        public ?int $returnsGameSecond,
    ) {
    }

    public function phaseAt(int $gameSeconds): StationingPhase
    {
        if ($this->returnsGameSecond !== null) {
            return StationingPhase::Returning;
        }

        return $gameSeconds < $this->landsGameSecond ? StationingPhase::Outbound : StationingPhase::Stationed;
    }

    /**
     * @return int the game seconds before the aircraft lands, or before it is home again; none while it stands at the camp
     */
    public function remainingSecondsAt(int $gameSeconds): int
    {
        return max(0, ($this->returnsGameSecond ?? $this->landsGameSecond) - $gameSeconds);
    }
}
