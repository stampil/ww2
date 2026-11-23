<?php

declare(strict_types=1);

namespace Ww2\Base;

use Ww2\Database\Database;
use Ww2\World\Bases;
use Ww2\World\SitePlaces;

/**
 * The supplies the front sends to each camp by itself, a little each minute of game time, less to a camp near the front than to one in the rear. A camp that is not looked at
 * stops earning after an hour, so that leaving the game does not store up supplies. The figures are mine.
 */
final class SupplyIncome
{
    public const FRONT_PER_MINUTE = 10;
    public const REAR_PER_MINUTE = 40;
    private const SECONDS_PER_MINUTE = 60;
    private const MAX_ACCRUED_SECONDS = 3600;

    public function __construct(
        private readonly Database $database,
        private readonly BaseStore $baseStore,
        private readonly Bases $bases,
        private readonly SitePlaces $places,
    ) {
    }

    /**
     * @return int the supplies a camp earns each minute, by how far it stands from the front
     */
    public function perMinuteAt(int $baseId): int
    {
        $depth = $this->places->frontDepth($this->bases->siteOf($baseId));

        return (int) round(self::FRONT_PER_MINUTE + (self::REAR_PER_MINUTE - self::FRONT_PER_MINUTE) * $depth);
    }

    /**
     * Pays the income of the whole minutes gone by since the last time, and starts counting on the first call.
     */
    public function settle(int $baseId, int $gameSeconds): void
    {
        $rows = $this->database->fetchAll('SELECT accrued_game_second FROM base_supply_ticks WHERE base_id = :base_id', ['base_id' => $baseId]);
        if ($rows === []) {
            $this->database->execute(
                'INSERT INTO base_supply_ticks (base_id, accrued_game_second) VALUES (:base_id, :game_second) ON DUPLICATE KEY UPDATE base_id = base_id',
                ['base_id' => $baseId, 'game_second' => $gameSeconds],
            );

            return;
        }
        $accrued = (int) $rows[0]['accrued_game_second'];
        $minutes = intdiv(min($gameSeconds - $accrued, self::MAX_ACCRUED_SECONDS), self::SECONDS_PER_MINUTE);
        if ($minutes < 1) {
            return;
        }
        $claimed = $this->database->execute(
            'UPDATE base_supply_ticks SET accrued_game_second = :game_second WHERE base_id = :base_id AND accrued_game_second = :accrued',
            ['game_second' => $gameSeconds, 'base_id' => $baseId, 'accrued' => $accrued],
        );
        if ($claimed === 1) {
            $this->baseStore->addRewards($baseId, $minutes * $this->perMinuteAt($baseId), 0);
        }
    }
}
