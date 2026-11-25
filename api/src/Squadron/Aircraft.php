<?php

declare(strict_types=1);

namespace Ww2\Squadron;

use Ww2\Clock\ParisCalendar;

/**
 * An aircraft of a squadron: its type, its livery, how much of its durability is left, its number, painted on its fin, which it keeps and no other aircraft of the base takes, and the day it was made.
 */
final readonly class Aircraft
{
    public function __construct(public int $id, public AircraftModel $model, public Livery $livery, public int $durability, public int $number, public int $commissionedEpoch)
    {
    }

    /**
     * @param int $nowEpoch the present moment, in seconds since 1970, from which the days of service are counted
     * @return array{id: int, number: int, durability: int, livery: string, serviceDays: int, model: array<string, int|string>}
     */
    public function toArray(int $nowEpoch): array
    {
        return [
            'id' => $this->id,
            'number' => $this->number,
            'durability' => $this->durability,
            'livery' => $this->livery->value,
            'serviceDays' => ParisCalendar::daysBetween($this->commissionedEpoch, $nowEpoch),
            'model' => $this->model->toArray(),
        ];
    }
}
