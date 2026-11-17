<?php

declare(strict_types=1);

namespace Ww2\Mission;

use Ww2\Mission\Dogfight\Dogfight;
use Ww2\Mission\Dogfight\DogfightState;

/**
 * A call to the player during a flight: a mini-game for one aircraft, which shows from a game second on, is started, then played move by move.
 */
final readonly class FlightAlert
{
    public function __construct(
        public int $id,
        public int $missionId,
        public int $aircraftId,
        public AlertKind $kind,
        public int $dueGameSecond,
        public int $moves,
        public ?DogfightState $state,
    ) {
    }

    public function isFinished(): bool
    {
        return $this->state?->outcome !== null;
    }

    /**
     * @return array{id: int, kind: string, aircraftId: int, dueSeconds: int, arenaSize: int, moves: int, state: array<string, mixed>|null}
     */
    public function toArray(int $gameSeconds): array
    {
        return [
            'id' => $this->id,
            'kind' => $this->kind->value,
            'aircraftId' => $this->aircraftId,
            'dueSeconds' => max(0, $this->dueGameSecond - $gameSeconds),
            'arenaSize' => Dogfight::ARENA_SIZE,
            'moves' => $this->moves,
            'state' => $this->state?->toArray(),
        ];
    }
}
