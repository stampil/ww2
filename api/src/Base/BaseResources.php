<?php

declare(strict_types=1);

namespace Ww2\Base;

/**
 * What a base holds: supplies to buy with, stocks, and the command points won by missions.
 */
final readonly class BaseResources
{
    public function __construct(
        public int $supplies,
        public int $fuel,
        public int $ammunition,
        public int $materials,
        public int $commandPoints,
    ) {
    }

    public function stock(Stock $stock): int
    {
        return match ($stock) {
            Stock::Fuel => $this->fuel,
            Stock::Ammunition => $this->ammunition,
            Stock::Materials => $this->materials,
        };
    }

    /**
     * @return array{supplies: int, fuel: int, ammunition: int, materials: int, commandPoints: int}
     */
    public function toArray(): array
    {
        return [
            'supplies' => $this->supplies,
            'fuel' => $this->fuel,
            'ammunition' => $this->ammunition,
            'materials' => $this->materials,
            'commandPoints' => $this->commandPoints,
        ];
    }
}
