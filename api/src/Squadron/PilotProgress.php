<?php

declare(strict_types=1);

namespace Ww2\Squadron;

/**
 * What a flight made of a pilot: the rank they were promoted to, if any, and whether it made them an ace.
 */
final readonly class PilotProgress
{
    public function __construct(public ?int $promotedTo, public bool $becameAce)
    {
    }

    /**
     * @return array{promotedTo: int|null, becameAce: bool}
     */
    public function toArray(): array
    {
        return ['promotedTo' => $this->promotedTo, 'becameAce' => $this->becameAce];
    }
}
