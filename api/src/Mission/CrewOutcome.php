<?php

declare(strict_types=1);

namespace Ww2\Mission;

/**
 * What a flight did to one pilot and the aircraft they flew: the durability lost, the gauges of the pilot after it, and the losses.
 */
final readonly class CrewOutcome
{
    public function __construct(
        public int $pilotId,
        public int $aircraftId,
        public string $pilotName,
        public string $aircraftName,
        public int $damage,
        public int $durability,
        public bool $aircraftLost,
        public bool $pilotKilled,
        public int $fatigue,
        public int $stress,
    ) {
    }

    /**
     * @return array{pilotName: string, aircraftName: string, damage: int, aircraftLost: bool, pilotKilled: bool}
     */
    public function toArray(): array
    {
        return [
            'pilotName' => $this->pilotName,
            'aircraftName' => $this->aircraftName,
            'damage' => $this->damage,
            'aircraftLost' => $this->aircraftLost,
            'pilotKilled' => $this->pilotKilled,
        ];
    }
}
