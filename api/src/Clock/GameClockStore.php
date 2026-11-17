<?php

declare(strict_types=1);

namespace Ww2\Clock;

use LogicException;
use Ww2\Database\Database;

/**
 * Keeps the game clocks of the players in the database; a clock runs from the moment it starts, by the clock of the database.
 */
final class GameClockStore
{
    public function __construct(private readonly Database $database)
    {
    }

    public function start(int $playerId): void
    {
        $this->database->execute(
            'INSERT INTO game_clocks (player_id, started_at) VALUES (:player_id, NOW())',
            ['player_id' => $playerId],
        );
    }

    public function of(int $playerId): GameClock
    {
        $rows = $this->database->fetchAll(
            'SELECT TIMESTAMPDIFF(SECOND, started_at, NOW()) AS game_seconds FROM game_clocks WHERE player_id = :player_id',
            ['player_id' => $playerId],
        );
        if ($rows === []) {
            throw new LogicException('The player has no clock.');
        }

        return new GameClock((int) $rows[0]['game_seconds']);
    }
}
