<?php

declare(strict_types=1);

namespace Ww2\Base;

use Ww2\Database\Database;

/**
 * Remembers when each player last asked the game for anything, so that a camp whose player has left can be told from one whose player is there to defend it.
 */
final class PlayerActivity
{
    /** How long a player can go without a request and still be there. */
    private const PRESENT_SECONDS = 600;

    public function __construct(private readonly Database $database)
    {
    }

    public function touch(int $playerId): void
    {
        $this->database->execute(
            'INSERT INTO player_activity (player_id, seen_at) VALUES (:player_id, NOW(6)) ON DUPLICATE KEY UPDATE seen_at = NOW(6)',
            ['player_id' => $playerId],
        );
    }

    public function isAbsent(int $playerId): bool
    {
        $rows = $this->database->fetchAll(
            'SELECT TIMESTAMPDIFF(SECOND, seen_at, NOW(6)) AS idle FROM player_activity WHERE player_id = :player_id',
            ['player_id' => $playerId],
        );

        return $rows === [] || (int) $rows[0]['idle'] > self::PRESENT_SECONDS;
    }
}
