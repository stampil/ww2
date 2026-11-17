<?php

declare(strict_types=1);

namespace Ww2\Base;

/**
 * A part being made at the workshop, with the seconds left by the clock of the database.
 */
final readonly class ProductionJob
{
    public function __construct(public int $id, public SparePart $part, public int $remainingSeconds, public bool $hasMechanic)
    {
    }

    /**
     * @return array{id: int, part: string, remainingSeconds: int, hasMechanic: bool}
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'part' => $this->part->value,
            'remainingSeconds' => $this->remainingSeconds,
            'hasMechanic' => $this->hasMechanic,
        ];
    }
}
