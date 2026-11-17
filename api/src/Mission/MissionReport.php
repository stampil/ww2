<?php

declare(strict_types=1);

namespace Ww2\Mission;

/**
 * The result of a mission: whether it succeeded, what it paid, and what it did to each crew.
 */
final readonly class MissionReport
{
    /**
     * @param list<CrewOutcome> $crews
     */
    public function __construct(
        public MissionType $type,
        public bool $success,
        public int $windSpeed,
        public int $suppliesWon,
        public int $commandPointsWon,
        public array $crews,
    ) {
    }

    /**
     * @return array{type: string, success: bool, windSpeed: int, suppliesWon: int, commandPointsWon: int, crews: list<array<string, int|string|bool>>}
     */
    public function toArray(): array
    {
        return [
            'type' => $this->type->value,
            'success' => $this->success,
            'windSpeed' => $this->windSpeed,
            'suppliesWon' => $this->suppliesWon,
            'commandPointsWon' => $this->commandPointsWon,
            'crews' => array_map(static fn (CrewOutcome $crew): array => $crew->toArray(), $this->crews),
        ];
    }
}
