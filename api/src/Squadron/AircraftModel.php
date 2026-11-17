<?php

declare(strict_types=1);

namespace Ww2\Squadron;

/**
 * A type of aircraft the game knows, with the figures that every aircraft of that type has.
 */
final readonly class AircraftModel
{
    public function __construct(
        public int $id,
        public string $code,
        public string $name,
        public AircraftCategory $category,
        public int $durability,
        public int $maneuverability,
        public int $fuelCapacity,
        public int $ammunitionCapacity,
    ) {
    }

    /**
     * @return array{code: string, name: string, category: string, durability: int, maneuverability: int, fuelCapacity: int, ammunitionCapacity: int}
     */
    public function toArray(): array
    {
        return [
            'code' => $this->code,
            'name' => $this->name,
            'category' => $this->category->value,
            'durability' => $this->durability,
            'maneuverability' => $this->maneuverability,
            'fuelCapacity' => $this->fuelCapacity,
            'ammunitionCapacity' => $this->ammunitionCapacity,
        ];
    }
}
