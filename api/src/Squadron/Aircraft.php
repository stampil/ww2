<?php

declare(strict_types=1);

namespace Ww2\Squadron;

/**
 * An aircraft of a squadron: its type, how much of its durability is left, and its number, painted on its fin, which it keeps and no other aircraft of the base takes.
 */
final readonly class Aircraft
{
    public function __construct(public int $id, public AircraftModel $model, public int $durability, public int $number)
    {
    }

    /**
     * @return array{id: int, number: int, durability: int, model: array<string, int|string>}
     */
    public function toArray(): array
    {
        return ['id' => $this->id, 'number' => $this->number, 'durability' => $this->durability, 'model' => $this->model->toArray()];
    }
}
