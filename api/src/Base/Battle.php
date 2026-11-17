<?php

declare(strict_types=1);

namespace Ww2\Base;

use Ww2\Database\Database;
use Ww2\Squadron\SquadronFounder;
use Ww2\Squadron\SquadronStore;

/**
 * The battle of a base: won when enough enemy aircraft are shot down, lost when the squadron has no pilot or no aircraft left.
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
    ) {
    }

    public function statusOf(int $baseId): BattleStatus
    {
        if ($this->battles->killsOf($baseId) >= self::KILL_TARGET) {
            return BattleStatus::Won;
        }
        if ($this->squadrons->pilotsOf($baseId) === [] || $this->squadrons->aircraftOf($baseId) === []) {
            return BattleStatus::Lost;
        }

        return BattleStatus::Ongoing;
    }

    /**
     * @return array{kills: int, target: int, status: string}
     */
    public function describe(int $baseId): array
    {
        return ['kills' => $this->battles->killsOf($baseId), 'target' => self::KILL_TARGET, 'status' => $this->statusOf($baseId)->value];
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
     * Starts a new battle on the same base: the squadron and the stocks are founded again, as when the base was claimed.
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
     * Founds the base again, as when it was claimed, whatever state the battle is in: the player starts from scratch.
     */
    public function startOver(int $baseId): void
    {
        $this->database->transaction(function () use ($baseId): void {
            $this->battles->eraseGameOf($baseId);
            $this->squadronFounder->found($baseId);
            $this->baseFounder->found($baseId);
        });
    }
}
