<?php

declare(strict_types=1);

namespace Ww2\Base;

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
        private readonly BattleStore $battles,
        private readonly SquadronStore $squadrons,
        private readonly SquadronFounder $squadronFounder,
        private readonly BaseFounder $baseFounder,
    ) {
    }

    public function statusOf(int $playerId): BattleStatus
    {
        if ($this->battles->killsOf($playerId) >= self::KILL_TARGET) {
            return BattleStatus::Won;
        }
        if ($this->squadrons->pilotsOf($playerId) === [] || $this->squadrons->aircraftOf($playerId) === []) {
            return BattleStatus::Lost;
        }

        return BattleStatus::Ongoing;
    }

    /**
     * @return array{kills: int, target: int, status: string}
     */
    public function describe(int $playerId): array
    {
        return ['kills' => $this->battles->killsOf($playerId), 'target' => self::KILL_TARGET, 'status' => $this->statusOf($playerId)->value];
    }

    /**
     * @throws BaseException when the battle is over
     */
    public function assertOngoing(int $playerId): void
    {
        if ($this->statusOf($playerId) !== BattleStatus::Ongoing) {
            throw new BaseException(BaseError::BattleOver);
        }
    }

    /**
     * Starts a new battle: the squadron and the base are founded again, as for a new player.
     *
     * @throws BaseException when the battle is not over
     */
    public function restart(int $playerId): void
    {
        if ($this->statusOf($playerId) === BattleStatus::Ongoing) {
            throw new BaseException(BaseError::BattleOngoing);
        }
        $this->battles->eraseGameOf($playerId);
        $this->squadronFounder->found($playerId);
        $this->baseFounder->found($playerId);
    }
}
