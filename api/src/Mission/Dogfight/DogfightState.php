<?php

declare(strict_types=1);

namespace Ww2\Mission\Dogfight;

/**
 * A dogfight at one moment: the turn it is at, where both aircraft are, and how it ended once it is over.
 */
final readonly class DogfightState
{
    public function __construct(
        public int $turn,
        public Position $player,
        public Position $enemy,
        public ?DogfightOutcome $outcome,
    ) {
    }

    /**
     * @param array{turn: int, player: array{x: int, y: int, heading: int}, enemy: array{x: int, y: int, heading: int}, outcome: string|null} $fields
     */
    public static function fromArray(array $fields): self
    {
        return new self(
            $fields['turn'],
            Position::fromArray($fields['player']),
            Position::fromArray($fields['enemy']),
            $fields['outcome'] === null ? null : DogfightOutcome::from($fields['outcome']),
        );
    }

    /**
     * @return array{turn: int, player: array{x: int, y: int, heading: int}, enemy: array{x: int, y: int, heading: int}, outcome: string|null}
     */
    public function toArray(): array
    {
        return [
            'turn' => $this->turn,
            'player' => $this->player->toArray(),
            'enemy' => $this->enemy->toArray(),
            'outcome' => $this->outcome?->value,
        ];
    }
}
