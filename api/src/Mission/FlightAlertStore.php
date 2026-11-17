<?php

declare(strict_types=1);

namespace Ww2\Mission;

use Ww2\Database\Database;
use Ww2\Mission\Dogfight\DogfightState;

/**
 * Keeps the alerts of the flights; the state of a mini-game is a JSON document in the row.
 */
final class FlightAlertStore
{
    private const COLUMNS = 'flight_alerts.id, flight_alerts.mission_id, flight_alerts.aircraft_id, flight_alerts.kind, flight_alerts.due_game_second, flight_alerts.moves, flight_alerts.state';

    public function __construct(private readonly Database $database)
    {
    }

    public function add(int $missionId, int $aircraftId, AlertKind $kind, int $dueGameSecond, int $moves): void
    {
        $this->database->execute(
            'INSERT INTO flight_alerts (mission_id, aircraft_id, kind, due_game_second, moves) VALUES (:mission_id, :aircraft_id, :kind, :due_game_second, :moves)',
            ['mission_id' => $missionId, 'aircraft_id' => $aircraftId, 'kind' => $kind->value, 'due_game_second' => $dueGameSecond, 'moves' => $moves],
        );
    }

    /**
     * @return list<FlightAlert> the alerts of the flights of the base
     */
    public function of(int $baseId): array
    {
        $rows = $this->database->fetchAll(
            'SELECT ' . self::COLUMNS . ' FROM flight_alerts JOIN missions ON missions.id = flight_alerts.mission_id
             WHERE missions.base_id = :base_id ORDER BY flight_alerts.id',
            ['base_id' => $baseId],
        );

        return array_map(fn (array $row): FlightAlert => $this->alertOf($row), $rows);
    }

    public function find(int $baseId, int $alertId): ?FlightAlert
    {
        $rows = $this->database->fetchAll(
            'SELECT ' . self::COLUMNS . ' FROM flight_alerts JOIN missions ON missions.id = flight_alerts.mission_id
             WHERE missions.base_id = :base_id AND flight_alerts.id = :alert_id',
            ['base_id' => $baseId, 'alert_id' => $alertId],
        );

        return $rows === [] ? null : $this->alertOf($rows[0]);
    }

    public function saveState(int $alertId, DogfightState $state): void
    {
        $this->database->execute(
            'UPDATE flight_alerts SET state = :state WHERE id = :alert_id',
            ['state' => json_encode($state->toArray(), JSON_THROW_ON_ERROR), 'alert_id' => $alertId],
        );
    }

    /**
     * @param array<string, mixed> $row
     */
    private function alertOf(array $row): FlightAlert
    {
        return new FlightAlert(
            (int) $row['id'],
            (int) $row['mission_id'],
            (int) $row['aircraft_id'],
            AlertKind::from((string) $row['kind']),
            (int) $row['due_game_second'],
            (int) $row['moves'],
            $row['state'] === null ? null : DogfightState::fromArray(json_decode((string) $row['state'], true, 512, JSON_THROW_ON_ERROR)),
        );
    }
}
