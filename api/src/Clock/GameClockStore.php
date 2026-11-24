<?php

declare(strict_types=1);

namespace Ww2\Clock;

use LogicException;
use Ww2\Database\Database;

/**
 * Reads the game clock of a base: the one of its instance, which runs from the creation of the instance, by the clock of the database, whatever time zone that clock keeps.
 */
final class GameClockStore
{
    public function __construct(private readonly Database $database)
    {
    }

    public function of(int $baseId): GameClock
    {
        $rows = $this->database->fetchAll(
            'SELECT UNIX_TIMESTAMP(instances.started_at) AS started_epoch, UNIX_TIMESTAMP() AS now_epoch
             FROM bases JOIN instances ON instances.id = bases.instance_id WHERE bases.id = :base_id',
            ['base_id' => $baseId],
        );
        if ($rows === []) {
            throw new LogicException('The base does not exist.');
        }

        return new GameClock((int) $rows[0]['now_epoch'] - (int) $rows[0]['started_epoch'], (int) $rows[0]['started_epoch']);
    }
}
