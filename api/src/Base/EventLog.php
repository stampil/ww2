<?php

declare(strict_types=1);

namespace Ww2\Base;

use Ww2\Clock\GameClockStore;
use Ww2\Database\Database;

/**
 * The journal of what happened at a base: mission reports, aircraft that exploded, gifts, landings, camps taken and let go. Each entry is kept as a JSON document, with the game time it happened at.
 */
final class EventLog
{
    private const SHOWN = 5;
    /** How many entries the book of the journal opens on: the latest. */
    private const PAGES = 500;

    public function __construct(private readonly Database $database, private readonly GameClockStore $clocks)
    {
    }

    /**
     * @param array<string, mixed> $details what happened; its `kind` tells the front which sort of event it is
     */
    public function record(int $baseId, array $details): void
    {
        $this->database->execute(
            'INSERT INTO base_events (base_id, details) VALUES (:base_id, :details)',
            ['base_id' => $baseId, 'details' => json_encode($details + $this->clocks->of($baseId)->toArray(), JSON_THROW_ON_ERROR)],
        );
    }

    /**
     * @return list<array<string, mixed>> the latest events, the newest first, each with its id
     */
    public function latest(int $baseId): array
    {
        return $this->read($baseId, self::SHOWN);
    }

    /**
     * @return list<array<string, mixed>> the pages of the journal: the latest events, the oldest first, each with its id
     */
    public function pages(int $baseId): array
    {
        return array_reverse($this->read($baseId, self::PAGES));
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function read(int $baseId, int $count): array
    {
        $rows = $this->database->fetchAll(
            'SELECT id, details FROM base_events WHERE base_id = :base_id ORDER BY id DESC LIMIT ' . $count,
            ['base_id' => $baseId],
        );
        $events = [];
        foreach ($rows as $row) {
            $events[] = ['id' => (int) $row['id'], ...json_decode((string) $row['details'], true, flags: JSON_THROW_ON_ERROR)];
        }

        return $events;
    }
}
