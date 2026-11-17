<?php

declare(strict_types=1);

namespace Ww2\Base;

use Ww2\Database\Database;

/**
 * The journal of what happened at a base: mission reports, aircraft that exploded. Each entry is kept as a JSON document.
 */
final class EventLog
{
    private const SHOWN = 5;

    public function __construct(private readonly Database $database)
    {
    }

    /**
     * @param array<string, mixed> $details what happened; its `kind` tells the front which sort of event it is
     */
    public function record(int $playerId, array $details): void
    {
        $this->database->execute(
            'INSERT INTO base_events (player_id, details) VALUES (:player_id, :details)',
            ['player_id' => $playerId, 'details' => json_encode($details, JSON_THROW_ON_ERROR)],
        );
    }

    /**
     * @return list<array<string, mixed>> the latest events, the newest first, each with its id
     */
    public function latest(int $playerId): array
    {
        $rows = $this->database->fetchAll(
            'SELECT id, details FROM base_events WHERE player_id = :player_id ORDER BY id DESC LIMIT ' . self::SHOWN,
            ['player_id' => $playerId],
        );
        $events = [];
        foreach ($rows as $row) {
            $events[] = ['id' => (int) $row['id'], ...json_decode((string) $row['details'], true, flags: JSON_THROW_ON_ERROR)];
        }

        return $events;
    }
}
