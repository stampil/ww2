<?php

declare(strict_types=1);

namespace Ww2\Mission;

/**
 * A mission under way: who flies it, what each aircraft carries, the wind it left in, and the game seconds left before it is back.
 */
final readonly class Flight
{
    /**
     * @param list<array{pilotId: int, aircraftId: int}> $crews a pilot with the aircraft they fly
     */
    public function __construct(
        public Mission $mission,
        public int $fuelLoaded,
        public int $ammunitionLoaded,
        public int $windSpeed,
        public int $remainingSeconds,
        public array $crews,
    ) {
    }

    /**
     * @return array{id: int, type: string, remainingSeconds: int, fuelLoaded: int, ammunitionLoaded: int, crews: list<array{pilotId: int, aircraftId: int}>}
     */
    public function toArray(): array
    {
        return [
            'id' => $this->mission->id,
            'type' => $this->mission->type->value,
            'remainingSeconds' => $this->remainingSeconds,
            'fuelLoaded' => $this->fuelLoaded,
            'ammunitionLoaded' => $this->ammunitionLoaded,
            'crews' => $this->crews,
        ];
    }
}
