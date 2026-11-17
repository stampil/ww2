<?php

declare(strict_types=1);

namespace Ww2\Mission;

use Ww2\Mission\Dogfight\DogfightOutcome;

/**
 * A dogfight flown in real time from the cockpit: the browser plays it and says how it ended, so the server keeps only whether it began, and its result.
 */
final readonly class CockpitDuel
{
    public function __construct(public ?DogfightOutcome $outcome)
    {
    }
}
