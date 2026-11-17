<?php

declare(strict_types=1);

namespace Ww2\Base;

use Ww2\Database\Database;

/**
 * Keeps the progress of the battle of each base: the enemy aircraft shot down. It can also erase everything a player has in the game.
 */
final class BattleStore
{
    /** @var list<string> every table that holds something of a player's game, each with a player_id column */
    private const GAME_TABLES = [
        'pilots',
        'aircraft',
        'missions',
        'base_events',
        'production_jobs',
        'base_upgrades',
        'battle_progress',
        'base_resources',
        'base_terrains',
        'game_clocks',
    ];

    public function __construct(private readonly Database $database)
    {
    }

    public function killsOf(int $playerId): int
    {
        $rows = $this->database->fetchAll('SELECT kills FROM battle_progress WHERE player_id = :player_id', ['player_id' => $playerId]);

        return $rows === [] ? 0 : (int) $rows[0]['kills'];
    }

    public function addKills(int $playerId, int $kills): void
    {
        $this->database->execute(
            'INSERT INTO battle_progress (player_id, kills) VALUES (:player_id, :kills) ON DUPLICATE KEY UPDATE kills = kills + :added_kills',
            ['player_id' => $playerId, 'kills' => $kills, 'added_kills' => $kills],
        );
    }

    /**
     * Erases the squadron, the base and the battle of the player, so that the game can be founded again.
     */
    public function eraseGameOf(int $playerId): void
    {
        $this->database->transaction(function () use ($playerId): void {
            foreach (self::GAME_TABLES as $table) {
                $this->database->execute('DELETE FROM ' . $table . ' WHERE player_id = :player_id', ['player_id' => $playerId]);
            }
        });
    }
}
