<?php

declare(strict_types=1);

namespace Ww2\World;

use Ww2\Database\Database;

/**
 * The instances of the world: each is a copy of the map, with its own clock, that a group of players share and no one else sees.
 * A new one is laid out with every site free.
 */
final class Instances
{
    private const STARTING_TERRAIN_PLAN = 'start';

    public function __construct(private readonly Database $database)
    {
    }

    /**
     * @return int|null the oldest instance that still has a free base, or null when every base of every instance is taken
     */
    public function joinableId(): ?int
    {
        $rows = $this->database->fetchAll('SELECT instance_id FROM bases WHERE player_id IS NULL ORDER BY instance_id LIMIT 1');

        return $rows === [] ? null : (int) $rows[0]['instance_id'];
    }

    /**
     * Starts the clock of a new instance and lays its sites out, every base free.
     *
     * @return int the id of the new instance
     */
    public function create(): int
    {
        $this->database->execute('INSERT INTO instances (started_at) VALUES (NOW())');
        $instanceId = (int) $this->database->fetchAll('SELECT LAST_INSERT_ID() AS id')[0]['id'];
        foreach (Site::cases() as $site) {
            $this->database->execute(
                'INSERT INTO bases (instance_id, site, plan) VALUES (:instance_id, :site, :plan)',
                ['instance_id' => $instanceId, 'site' => $site->value, 'plan' => self::STARTING_TERRAIN_PLAN],
            );
        }

        return $instanceId;
    }
}
