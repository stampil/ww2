<?php

declare(strict_types=1);

namespace Ww2\Mission;

/**
 * A mission under way: who flies it, what each aircraft carries, the wind it left in, the game seconds left before it is back, and the camp it is sent against, if it is an attack.
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
        public ?int $targetBaseId = null,
        public ?string $targetSite = null,
    ) {
    }

    /**
     * @return array{id: int, type: string, risk: int, remainingSeconds: int, fuelLoaded: int, ammunitionLoaded: int, windSpeed: int, targetSite: string|null, crews: list<array{pilotId: int, aircraftId: int}>}
     */
    public function toArray(): array
    {
        return [
            'id' => $this->mission->id,
            'type' => $this->mission->type->value,
            'risk' => $this->mission->risk,
            'remainingSeconds' => $this->remainingSeconds,
            'fuelLoaded' => $this->fuelLoaded,
            'ammunitionLoaded' => $this->ammunitionLoaded,
            'windSpeed' => $this->windSpeed,
            'targetSite' => $this->targetSite,
            'crews' => $this->crews,
        ];
    }
}
