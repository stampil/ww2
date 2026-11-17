<?php

declare(strict_types=1);

namespace Ww2\Mission;

use Ww2\Base\SparePart;

/**
 * What a flight did to one pilot and the aircraft they flew: whether the crew succeeded, the durability lost, the modules destroyed, the fire, the gauges of the pilot after it, and the losses.
 */
final readonly class CrewOutcome
{
    /**
     * @param list<SparePart> $destroyedModules
     */
    public function __construct(
        public int $pilotId,
        public int $aircraftId,
        public string $pilotName,
        public string $aircraftName,
        public bool $succeeded,
        public int $damage,
        public int $durability,
        public array $destroyedModules,
        public bool $burning,
        public bool $aircraftLost,
        public bool $pilotKilled,
        public int $fatigue,
        public int $stress,
    ) {
    }

    /**
     * The destroyed modules are left out: only an inspection of the aircraft tells them.
     *
     * @return array{pilotName: string, aircraftName: string, damage: int, burning: bool, aircraftLost: bool, pilotKilled: bool}
     */
    public function toArray(): array
    {
        return [
            'pilotName' => $this->pilotName,
            'aircraftName' => $this->aircraftName,
            'damage' => $this->damage,
            'burning' => $this->burning,
            'aircraftLost' => $this->aircraftLost,
            'pilotKilled' => $this->pilotKilled,
        ];
    }
}
