<?php

declare(strict_types=1);

namespace Ww2\Base;

/**
 * The mechanics of a base: a few of them, shared by the workshop that makes parts and the hangar that repairs aircraft.
 */
final class Mechanics
{
    private const TOTAL = 2;

    public function __construct(private readonly BaseStore $bases, private readonly HangarStore $hangar)
    {
    }

    public function freeAt(int $baseId, int $gameSeconds): int
    {
        $busy = $this->hangar->runningRepairCount($baseId, $gameSeconds);
        foreach ($this->bases->runningJobs($baseId, $gameSeconds) as $job) {
            if ($job->hasMechanic) {
                $busy += 1;
            }
        }

        return self::TOTAL - $busy;
    }
}
