<?php

declare(strict_types=1);

namespace Ww2\Mission;

/**
 * A mission on the table of the headquarters. The fuel and the ammunition are what each aircraft needs.
 */
final readonly class Mission
{
    public function __construct(
        public int $id,
        public MissionType $type,
        public int $aircraftCount,
        public int $durationSeconds,
        public int $fuelPerAircraft,
        public int $ammunitionPerAircraft,
        public int $risk,
        public int $rewardSupplies,
        public int $rewardCommandPoints,
    ) {
    }

    /**
     * @return array{id: int, type: string, category: string|null, aircraftCount: int, durationSeconds: int, fuelPerAircraft: int, ammunitionPerAircraft: int, risk: int, rewardSupplies: int, rewardCommandPoints: int}
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type->value,
            'category' => $this->type->profile()->category?->value,
            'aircraftCount' => $this->aircraftCount,
            'durationSeconds' => $this->durationSeconds,
            'fuelPerAircraft' => $this->fuelPerAircraft,
            'ammunitionPerAircraft' => $this->ammunitionPerAircraft,
            'risk' => $this->risk,
            'rewardSupplies' => $this->rewardSupplies,
            'rewardCommandPoints' => $this->rewardCommandPoints,
        ];
    }
}
