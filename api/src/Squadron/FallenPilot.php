<?php

declare(strict_types=1);

namespace Ww2\Squadron;

/**
 * A pilot who died, as the memorial of the base keeps them: the name, the rank they had and what they had done.
 */
final readonly class FallenPilot
{
    public function __construct(
        public string $name,
        public int $rank,
        public PilotRecord $record,
    ) {
    }

    /**
     * @return array{name: string, rank: int, record: array<string, int|bool>}
     */
    public function toArray(): array
    {
        return ['name' => $this->name, 'rank' => $this->rank, 'record' => $this->record->toArray()];
    }
}
