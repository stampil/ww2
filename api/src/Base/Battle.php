<?php

declare(strict_types=1);

namespace Ww2\Base;

use Ww2\Database\Database;
use Ww2\Squadron\SquadronFounder;
use Ww2\Squadron\SquadronStore;
use Ww2\World\Bases;

/**
 * The battle of a player, over all the bases they hold: won when enough enemy aircraft are shot down, lost when they have no pilot or no aircraft left.
 * Once it is over the orders stop, until a new battle begins on a new base. The figures are mine.
 */
final class Battle
{
    private const KILL_TARGET = 8;

    public function __construct(
        private readonly Database $database,
        private readonly BattleStore $battles,
        private readonly SquadronStore $squadrons,
        private readonly SquadronFounder $squadronFounder,
        private readonly BaseFounder $baseFounder,
        private readonly Bases $bases,
    ) {
    }

    public function statusOf(int $baseId): BattleStatus
    {
        $heldIds = $this->heldIdsWith($baseId);
        if ($this->killsOf($heldIds) >= self::KILL_TARGET) {
            return BattleStatus::Won;
        }
        if ($this->hasNoPilotOrNoAircraft($heldIds)) {
            return BattleStatus::Lost;
        }

        return BattleStatus::Ongoing;
    }

    /**
     * @return array{kills: int, target: int, status: string}
     */
    public function describe(int $baseId): array
    {
        return ['kills' => $this->killsOf($this->heldIdsWith($baseId)), 'target' => self::KILL_TARGET, 'status' => $this->statusOf($baseId)->value];
    }

    /**
     * @throws BaseException when the battle is over
     */
    public function assertOngoing(int $baseId): void
    {
        if ($this->statusOf($baseId) !== BattleStatus::Ongoing) {
            throw new BaseException(BaseError::BattleOver);
        }
    }

    /**
     * Starts a new battle on the base, the first of the player: the squadron and the stocks are founded again, as when the base was claimed.
     *
     * @throws BaseException when the battle is not over
     */
    public function restart(int $baseId): void
    {
        if ($this->statusOf($baseId) === BattleStatus::Ongoing) {
            throw new BaseException(BaseError::BattleOngoing);
        }
        $this->startOver($baseId);
    }

    /**
     * Founds the base again, as when it was claimed, whatever state the battle is in: the player starts from scratch, and the other bases they hold are given back.
     */
    public function startOver(int $baseId): void
    {
        $this->database->transaction(function () use ($baseId): void {
            foreach ($this->heldIdsWith($baseId) as $heldId) {
                $this->battles->eraseGameOf($heldId);
                if ($heldId !== $baseId) {
                    $this->bases->release($heldId);
                }
            }
            $this->squadronFounder->found($baseId);
            $this->baseFounder->found($baseId);
        });
    }

    /**
     * @return list<int> the bases held by the player who holds this one
     */
    private function heldIdsWith(int $baseId): array
    {
        $ids = [];
        foreach ($this->bases->heldWith($baseId) as $held) {
            $ids[] = $held['id'];
        }

        return $ids;
    }

    /**
     * @param list<int> $heldIds
     */
    private function killsOf(array $heldIds): int
    {
        $kills = 0;
        foreach ($heldIds as $heldId) {
            $kills += $this->battles->killsOf($heldId);
        }

        return $kills;
    }

    /**
     * @param list<int> $heldIds
     */
    private function hasNoPilotOrNoAircraft(array $heldIds): bool
    {
        $hasPilot = false;
        $hasAircraft = false;
        foreach ($heldIds as $heldId) {
            $hasPilot = $hasPilot || $this->squadrons->pilotsOf($heldId) !== [];
            $hasAircraft = $hasAircraft || $this->squadrons->aircraftOf($heldId) !== [];
        }

        return !$hasPilot || !$hasAircraft;
    }
}
