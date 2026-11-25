<?php

declare(strict_types=1);

namespace Ww2\Base;

use Ww2\Squadron\SquadronStore;

/**
 * The mechanics of a base: the staff, shared by the workshop that makes parts and the hangar that inspects, repairs and rebuilds aircraft; each job takes one of them.
 */
final class Mechanics
{
    public function __construct(private readonly BaseStore $bases, private readonly HangarStore $hangar, private readonly SquadronStore $squadrons)
    {
    }

    public function freeAt(int $baseId, int $gameSeconds): int
    {
        $busy = $this->hangar->runningRepairCount($baseId, $gameSeconds) + $this->hangar->runningInspectionCount($baseId, $gameSeconds) + $this->hangar->runningRebuildCount($baseId, $gameSeconds);
        foreach ($this->bases->runningJobs($baseId, $gameSeconds) as $job) {
            if ($job->hasMechanic) {
                $busy += 1;
            }
        }

        return count($this->squadrons->mechanicsOf($baseId)) - $busy;
    }

    /**
     * @return int the average skill of the staff of the base, from 0 to 100
     */
    public function averageSkillAt(int $baseId): int
    {
        $skills = array_map(static fn ($mechanic): int => $mechanic->skill, $this->squadrons->mechanicsOf($baseId));

        return intdiv(array_sum($skills), count($skills));
    }
}
