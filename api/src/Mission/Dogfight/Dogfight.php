<?php

declare(strict_types=1);

namespace Ww2\Mission\Dogfight;

use Random\Randomizer;

/**
 * The rules of a dogfight on an invisible grid, after Until the Last Plane. The player attacks from behind; both play a maneuver at once,
 * turn after turn. When the player has played all its moves, the enemy is shot down if it is in the firing cone of the player, else it gets away,
 * as it does if either leaves the grid. The enemy has fewer moves than a good crew, and holds still once they are played. The figures are mine.
 */
final class Dogfight
{
    public const ARENA_SIZE = 9;
    public const ENEMY_MOVES = 4;
    private const BASE_MOVES = 3;
    private const AGILE_MANEUVERABILITY = 75;
    private const OFFICER_RANK = 4;
    private const PLAYER_START = [4, 1];
    private const ENEMY_START = [4, 3];
    private const NORTH = 0;
    private const RANDOM_REPLY_PERCENT = 40;
    private const PERCENT = 100;

    public function __construct(private readonly Randomizer $random = new Randomizer())
    {
    }

    /**
     * How many moves a crew plays: a nimble aircraft and a pilot who has been promoted to an officer each give one more.
     */
    public function movesFor(int $maneuverability, int $rank): int
    {
        $moves = self::BASE_MOVES;
        if ($maneuverability >= self::AGILE_MANEUVERABILITY) {
            $moves += 1;
        }
        if ($rank >= self::OFFICER_RANK) {
            $moves += 1;
        }

        return $moves;
    }

    public function begin(): DogfightState
    {
        return new DogfightState(
            0,
            new Position(self::PLAYER_START[0], self::PLAYER_START[1], self::NORTH),
            new Position(self::ENEMY_START[0], self::ENEMY_START[1], self::NORTH),
            null,
        );
    }

    /**
     * Plays one turn: the maneuver of the player against the reply of the enemy, if it still has moves; the last move of the player decides.
     */
    public function play(DogfightState $state, int $moves, Maneuver $playerManeuver): DogfightState
    {
        $enemyManeuver = $state->turn < self::ENEMY_MOVES ? $this->enemyManeuver($state) : null;
        [$player, $enemy] = $this->moved($state, $playerManeuver, $enemyManeuver);
        $turn = $state->turn + 1;
        $outcome = null;
        if (!$player->isInside(self::ARENA_SIZE) || !$enemy->isInside(self::ARENA_SIZE)) {
            $outcome = DogfightOutcome::Escaped;
        } elseif ($turn >= $moves) {
            $outcome = $player->aimsAt($enemy) ? DogfightOutcome::Won : DogfightOutcome::Escaped;
        }

        return new DogfightState($turn, $player, $enemy, $outcome);
    }

    /**
     * Where both aircraft stand after the maneuvers; one that would land on the cell of the other stays where it was.
     *
     * @return array{Position, Position} the player, then the enemy
     */
    private function moved(DogfightState $state, Maneuver $playerManeuver, ?Maneuver $enemyManeuver): array
    {
        $player = $state->player->after($playerManeuver);
        $enemy = $enemyManeuver === null ? $state->enemy : $state->enemy->after($enemyManeuver);
        if ($player->isOnCellOf($enemy)) {
            $enemy = $state->enemy;
            if ($player->isOnCellOf($enemy)) {
                $player = $state->player;
            }
        }

        return [$player, $enemy];
    }

    /**
     * The maneuver of the enemy, kept on the grid: now and then any, else the one after which the fewest maneuvers of the player aim at it; equal ones are drawn.
     */
    private function enemyManeuver(DogfightState $state): Maneuver
    {
        $options = [];
        foreach (Maneuver::cases() as $candidate) {
            if ($state->enemy->after($candidate)->isInside(self::ARENA_SIZE)) {
                $options[] = $candidate;
            }
        }
        if ($options === []) {
            $options = Maneuver::cases();
        }
        if ($this->random->getInt(1, self::PERCENT) <= self::RANDOM_REPLY_PERCENT) {
            return $options[$this->random->getInt(0, count($options) - 1)];
        }
        $best = [];
        $fewestAiming = null;
        foreach ($options as $candidate) {
            $aiming = 0;
            foreach (Maneuver::cases() as $playerManeuver) {
                [$player, $enemy] = $this->moved($state, $playerManeuver, $candidate);
                if ($player->aimsAt($enemy)) {
                    $aiming += 1;
                }
            }
            if ($fewestAiming === null || $aiming < $fewestAiming) {
                $fewestAiming = $aiming;
                $best = [$candidate];
            } elseif ($aiming === $fewestAiming) {
                $best[] = $candidate;
            }
        }

        return $best[$this->random->getInt(0, count($best) - 1)];
    }
}
