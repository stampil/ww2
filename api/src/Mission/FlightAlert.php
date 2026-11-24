<?php

declare(strict_types=1);

namespace Ww2\Mission;

use Ww2\Mission\Dogfight\Dogfight;
use Ww2\Mission\Dogfight\DogfightOutcome;
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
        public ?CockpitDuel $cockpit,
    ) {
    }

    public function isFinished(): bool
    {
        return $this->outcome() !== null;
    }

    /** How the mini-game ended, whichever way it was played; null while it goes on or has not begun. */
    public function outcome(): ?DogfightOutcome
    {
        return $this->state?->outcome ?? $this->cockpit?->outcome;
    }

    /**
     * @return array{id: int, kind: string, aircraftId: int, enemy: string, dueSeconds: int, arenaSize: int, moves: int, state: array<string, mixed>|null, cockpit: array{outcome: string|null}|null}
     */
    public function toArray(int $gameSeconds, EnemyType $enemy): array
    {
        return [
            'id' => $this->id,
            'kind' => $this->kind->value,
            'aircraftId' => $this->aircraftId,
            'enemy' => $enemy->value,
            'dueSeconds' => max(0, $this->dueGameSecond - $gameSeconds),
            'arenaSize' => Dogfight::ARENA_SIZE,
            'moves' => $this->moves,
            'state' => $this->state?->toArray(),
            'cockpit' => $this->cockpit === null ? null : ['outcome' => $this->cockpit->outcome?->value],
        ];
    }
}
