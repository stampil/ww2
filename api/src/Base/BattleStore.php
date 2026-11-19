<?php

declare(strict_types=1);

namespace Ww2\Base;

use Ww2\Database\Database;

/**
 * Keeps the progress of the battle of each base: the enemy aircraft shot down. It can also erase everything a base has in the game.
 */
final class BattleStore
{
    /** @var list<string> every table that holds something of a base's game, each with a base_id column */
    private const GAME_TABLES = [
        'pilots',
        'aircraft',
        'missions',
        'base_events',
        'production_jobs',
        'base_upgrades',
        'battle_progress',
        'base_resources',
    ];

    public function __construct(private readonly Database $database, private readonly StationingStore $stationings)
    {
    }

    public function killsOf(int $baseId): int
    {
        $rows = $this->database->fetchAll('SELECT kills FROM battle_progress WHERE base_id = :base_id', ['base_id' => $baseId]);

        return $rows === [] ? 0 : (int) $rows[0]['kills'];
    }

    public function addKills(int $baseId, int $kills): void
    {
        $this->database->execute(
            'INSERT INTO battle_progress (base_id, kills) VALUES (:base_id, :kills) ON DUPLICATE KEY UPDATE kills = kills + :added_kills',
            ['base_id' => $baseId, 'kills' => $kills, 'added_kills' => $kills],
        );
    }

    /**
     * Erases the squadron, the stocks and the battle of the base, so that the game can be founded again there; the aircraft of others stationed there are sent home.
     * The caller holds the transaction.
     */
    public function eraseGameOf(int $baseId): void
    {
        $this->stationings->sendGuestsHome($baseId);
        foreach (self::GAME_TABLES as $table) {
            $this->database->execute('DELETE FROM ' . $table . ' WHERE base_id = :base_id', ['base_id' => $baseId]);
        }
    }
}
