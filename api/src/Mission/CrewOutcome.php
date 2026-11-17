<?php

declare(strict_types=1);

namespace Ww2\Mission;

use Ww2\Base\SparePart;

/**
 * What a flight did to one pilot and the aircraft they flew: the durability lost, the modules destroyed, the fire, the gauges of the pilot after it, and the losses.
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
     * @return array{pilotName: string, aircraftName: string, damage: int, destroyedModules: list<string>, burning: bool, aircraftLost: bool, pilotKilled: bool}
     */
    public function toArray(): array
    {
        return [
            'pilotName' => $this->pilotName,
            'aircraftName' => $this->aircraftName,
            'damage' => $this->damage,
            'destroyedModules' => array_map(static fn (SparePart $part): string => $part->value, $this->destroyedModules),
            'burning' => $this->burning,
            'aircraftLost' => $this->aircraftLost,
            'pilotKilled' => $this->pilotKilled,
        ];
    }
}
