<?php

declare(strict_types=1);

namespace Ww2\Clock;

use LogicException;
use Ww2\Database\Database;

/**
 * Keeps the game clocks of the players in the database; the real time of a running clock comes from the database clock.
 */
final class GameClockStore
{
    public function __construct(private readonly Database $database)
    {
    }

    public function start(int $playerId): void
    {
        $this->database->execute(
            'INSERT INTO game_clocks (player_id, elapsed_seconds, running_since) VALUES (:player_id, 0, NOW())',
            ['player_id' => $playerId],
        );
    }

    public function of(int $playerId): GameClock
    {
        $rows = $this->database->fetchAll(
            'SELECT elapsed_seconds + IF(running_since IS NULL, 0, TIMESTAMPDIFF(SECOND, running_since, NOW())) AS game_seconds,
                    running_since IS NULL AS paused
             FROM game_clocks WHERE player_id = :player_id',
            ['player_id' => $playerId],
        );
        if ($rows === []) {
            throw new LogicException('The player has no clock.');
        }

        return new GameClock((int) $rows[0]['game_seconds'], (bool) $rows[0]['paused']);
    }

    /**
     * Stops the clock where it stands; a clock already paused stays as it is.
     */
    public function pause(int $playerId): void
    {
        $this->database->execute(
            'UPDATE game_clocks
             SET elapsed_seconds = elapsed_seconds + TIMESTAMPDIFF(SECOND, running_since, NOW()), running_since = NULL
             WHERE player_id = :player_id AND running_since IS NOT NULL',
            ['player_id' => $playerId],
        );
    }

    /**
     * Sets the clock going again from where it stopped; a clock already running stays as it is.
     */
    public function resume(int $playerId): void
    {
        $this->database->execute(
            'UPDATE game_clocks SET running_since = NOW() WHERE player_id = :player_id AND running_since IS NULL',
            ['player_id' => $playerId],
        );
    }
}
