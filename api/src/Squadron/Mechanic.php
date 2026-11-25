<?php

declare(strict_types=1);

namespace Ww2\Squadron;

/**
 * A mechanic of a base, with the skill that shortens what the repair staff builds.
 */
final readonly class Mechanic
{
    public function __construct(public int $id, public int $skill)
    {
    }

    /**
     * @return array{id: int, skill: int}
     */
    public function toArray(): array
    {
        return ['id' => $this->id, 'skill' => $this->skill];
    }
}
