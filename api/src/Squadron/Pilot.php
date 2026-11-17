<?php

declare(strict_types=1);

namespace Ww2\Squadron;

/**
 * A pilot of a squadron. Above the fatigue limit, every point of fatigue takes one percent off accuracy and resilience.
 */
final readonly class Pilot
{
    private const FATIGUE_LIMIT = 50;
    private const PERCENT = 100;

    public function __construct(
        public int $id,
        public string $name,
        public int $rank,
        public int $fatigue,
        public int $stress,
        public int $accuracy,
        public int $resilience,
    ) {
    }

    public function effectiveAccuracy(): int
    {
        return (int) round($this->accuracy * $this->fatigueFactor());
    }

    public function effectiveResilience(): int
    {
        return (int) round($this->resilience * $this->fatigueFactor());
    }

    /**
     * @return array{id: int, name: string, rank: int, fatigue: int, stress: int, accuracy: int, resilience: int, effectiveAccuracy: int, effectiveResilience: int}
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'rank' => $this->rank,
            'fatigue' => $this->fatigue,
            'stress' => $this->stress,
            'accuracy' => $this->accuracy,
            'resilience' => $this->resilience,
            'effectiveAccuracy' => $this->effectiveAccuracy(),
            'effectiveResilience' => $this->effectiveResilience(),
        ];
    }

    private function fatigueFactor(): float
    {
        return 1 - max(0, $this->fatigue - self::FATIGUE_LIMIT) / self::PERCENT;
    }
}
