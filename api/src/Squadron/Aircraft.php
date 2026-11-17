<?php

declare(strict_types=1);

namespace Ww2\Squadron;

/**
 * An aircraft of a squadron: its type, and how much of its durability is left.
 */
final readonly class Aircraft
{
    public function __construct(public int $id, public AircraftModel $model, public int $durability)
    {
    }

    /**
     * @return array{id: int, durability: int, model: array<string, int|string>}
     */
    public function toArray(): array
    {
        return ['id' => $this->id, 'durability' => $this->durability, 'model' => $this->model->toArray()];
    }
}
