<?php

declare(strict_types=1);

namespace Ww2\Base;

use Ww2\Database\Database;
use Ww2\Squadron\SquadronStore;

/**
 * The little happenings of the life of a camp, which the journal tells between the flights: one every six real hours, the latest three at most when nobody looked at the camp for longer.
 */
final class LifeEvents
{
    private const INTERVAL_SECONDS = 21600;
    private const CATCH_UP_LIMIT = 3;
    /** How many different happenings the front can tell, numbered from 0. */
    private const TOPICS = 12;

    public function __construct(
        private readonly Database $database,
        private readonly EventLog $events,
        private readonly SquadronStore $squadrons,
    ) {
    }

    /**
     * Writes into the journal what happened at the camp since it was last looked at. The first time a camp is looked at only starts the count.
     */
    public function settle(int $baseId): void
    {
        $rows = $this->database->fetchAll('SELECT last_epoch, UNIX_TIMESTAMP() AS now_epoch FROM base_life_ticks WHERE base_id = :base_id', ['base_id' => $baseId]);
        if ($rows === []) {
            $this->database->execute('INSERT IGNORE INTO base_life_ticks (base_id, last_epoch) VALUES (:base_id, UNIX_TIMESTAMP())', ['base_id' => $baseId]);

            return;
        }
        $lastEpoch = (int) $rows[0]['last_epoch'];
        $due = intdiv((int) $rows[0]['now_epoch'] - $lastEpoch, self::INTERVAL_SECONDS);
        if ($due === 0) {
            return;
        }
        // Whoever moves the count forward writes the pages: a reading at the same moment finds it moved, and writes none.
        $moved = $this->database->execute(
            'UPDATE base_life_ticks SET last_epoch = last_epoch + :advance WHERE base_id = :base_id AND last_epoch = :last_epoch',
            ['advance' => $due * self::INTERVAL_SECONDS, 'base_id' => $baseId, 'last_epoch' => $lastEpoch],
        );
        if ($moved !== 1) {
            return;
        }
        $pilots = $this->squadrons->pilotsOf($baseId);
        $topics = range(0, self::TOPICS - 1);
        shuffle($topics);
        for ($page = 0; $page < min($due, self::CATCH_UP_LIMIT); $page += 1) {
            $this->events->record($baseId, [
                'kind' => 'life',
                'topic' => $topics[$page],
                'pilotName' => $pilots === [] ? null : $pilots[random_int(0, count($pilots) - 1)]->name,
            ]);
        }
    }
}
