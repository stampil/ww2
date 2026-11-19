<?php

declare(strict_types=1);

namespace Ww2\Base;

use Ww2\Database\Database;

/**
 * Keeps the stationings in the database: one row for each aircraft that is away, from the day it takes off until it is home again.
 */
final class StationingStore
{
    private const COLUMNS = 'aircraft_id, pilot_id, origin_base_id, destination_base_id, fuel, ammunition, lands_game_second, returns_game_second';

    public function __construct(private readonly Database $database)
    {
    }

    public function add(Stationing $stationing): void
    {
        $this->database->execute(
            'INSERT INTO stationings (' . self::COLUMNS . ') VALUES (:aircraft_id, :pilot_id, :origin_base_id, :destination_base_id, :fuel, :ammunition, :lands_game_second, NULL)',
            [
                'aircraft_id' => $stationing->aircraftId,
                'pilot_id' => $stationing->pilotId,
                'origin_base_id' => $stationing->originBaseId,
                'destination_base_id' => $stationing->destinationBaseId,
                'fuel' => $stationing->fuel,
                'ammunition' => $stationing->ammunition,
                'lands_game_second' => $stationing->landsGameSecond,
            ],
        );
    }

    public function of(int $aircraftId): ?Stationing
    {
        $rows = $this->database->fetchAll('SELECT ' . self::COLUMNS . ' FROM stationings WHERE aircraft_id = :aircraft_id', ['aircraft_id' => $aircraftId]);

        return $rows === [] ? null : $this->stationingFrom($rows[0]);
    }

    /**
     * @return list<Stationing> the stationings that start from the base or end at it, by aircraft
     */
    public function involving(int $baseId): array
    {
        $rows = $this->database->fetchAll(
            'SELECT ' . self::COLUMNS . ' FROM stationings WHERE origin_base_id = :origin_base_id OR destination_base_id = :destination_base_id ORDER BY aircraft_id',
            ['origin_base_id' => $baseId, 'destination_base_id' => $baseId],
        );

        return array_map(fn (array $row): Stationing => $this->stationingFrom($row), $rows);
    }

    public function startReturn(int $aircraftId, int $returnsGameSecond): void
    {
        $this->database->execute(
            'UPDATE stationings SET returns_game_second = :returns_game_second WHERE aircraft_id = :aircraft_id',
            ['returns_game_second' => $returnsGameSecond, 'aircraft_id' => $aircraftId],
        );
    }

    public function emptyHold(int $aircraftId): void
    {
        $this->database->execute('UPDATE stationings SET fuel = 0, ammunition = 0 WHERE aircraft_id = :aircraft_id', ['aircraft_id' => $aircraftId]);
    }

    /**
     * Takes off the books the aircraft that are home again, so that they are free to fly.
     */
    public function clearReturned(int $baseId, int $gameSeconds): void
    {
        $this->database->execute(
            'DELETE FROM stationings WHERE returns_game_second <= :game_seconds AND (origin_base_id = :origin_base_id OR destination_base_id = :destination_base_id)',
            ['game_seconds' => $gameSeconds, 'origin_base_id' => $baseId, 'destination_base_id' => $baseId],
        );
    }

    /**
     * Sends home at once the aircraft stationed at a base, when its game is erased: they are the other players' and must not stay at a camp that is gone.
     */
    public function sendGuestsHome(int $baseId): void
    {
        $this->database->execute('DELETE FROM stationings WHERE destination_base_id = :base_id', ['base_id' => $baseId]);
    }

    /**
     * @param int $gameSeconds the game time now: an aircraft that is back home is not away
     */
    public function isAircraftAway(int $aircraftId, int $gameSeconds): bool
    {
        $rows = $this->database->fetchAll(
            'SELECT COUNT(*) AS total FROM stationings WHERE aircraft_id = :aircraft_id AND (returns_game_second IS NULL OR returns_game_second > :game_seconds)',
            ['aircraft_id' => $aircraftId, 'game_seconds' => $gameSeconds],
        );

        return (int) $rows[0]['total'] > 0;
    }

    /**
     * @param int $gameSeconds the game time now: a pilot who is back home is not away
     */
    public function isPilotAway(int $pilotId, int $gameSeconds): bool
    {
        $rows = $this->database->fetchAll(
            'SELECT COUNT(*) AS total FROM stationings WHERE pilot_id = :pilot_id AND (returns_game_second IS NULL OR returns_game_second > :game_seconds)',
            ['pilot_id' => $pilotId, 'game_seconds' => $gameSeconds],
        );

        return (int) $rows[0]['total'] > 0;
    }

    /**
     * @param array<string, scalar|null> $row
     */
    private function stationingFrom(array $row): Stationing
    {
        return new Stationing(
            (int) $row['aircraft_id'],
            (int) $row['pilot_id'],
            (int) $row['origin_base_id'],
            (int) $row['destination_base_id'],
            (int) $row['fuel'],
            (int) $row['ammunition'],
            (int) $row['lands_game_second'],
            $row['returns_game_second'] === null ? null : (int) $row['returns_game_second'],
        );
    }
}
