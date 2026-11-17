<?php

declare(strict_types=1);

namespace Ww2\Mission;

use Ww2\Database\Database;

/**
 * Keeps the missions of the players in the database: on the table until launched, under way until the squadron is received.
 */
final class MissionStore
{
    private const MISSION_COLUMNS = 'id, type, aircraft_count, duration_seconds, fuel_per_aircraft, ammunition_per_aircraft, risk, reward_supplies, reward_command_points';

    public function __construct(private readonly Database $database)
    {
    }

    public function addOffer(int $playerId, Mission $mission): void
    {
        $this->database->execute(
            'INSERT INTO missions (player_id, type, aircraft_count, duration_seconds, fuel_per_aircraft, ammunition_per_aircraft, risk, reward_supplies, reward_command_points)
             VALUES (:player_id, :type, :aircraft_count, :duration_seconds, :fuel_per_aircraft, :ammunition_per_aircraft, :risk, :reward_supplies, :reward_command_points)',
            [
                'player_id' => $playerId,
                'type' => $mission->type->value,
                'aircraft_count' => $mission->aircraftCount,
                'duration_seconds' => $mission->durationSeconds,
                'fuel_per_aircraft' => $mission->fuelPerAircraft,
                'ammunition_per_aircraft' => $mission->ammunitionPerAircraft,
                'risk' => $mission->risk,
                'reward_supplies' => $mission->rewardSupplies,
                'reward_command_points' => $mission->rewardCommandPoints,
            ],
        );
    }

    /**
     * @return list<Mission> the missions not launched yet, the oldest first
     */
    public function offersOf(int $playerId): array
    {
        $rows = $this->database->fetchAll(
            'SELECT ' . self::MISSION_COLUMNS . ' FROM missions WHERE player_id = :player_id AND return_game_second IS NULL ORDER BY id',
            ['player_id' => $playerId],
        );

        return array_map($this->missionFrom(...), $rows);
    }

    public function offer(int $playerId, int $missionId): ?Mission
    {
        foreach ($this->offersOf($playerId) as $mission) {
            if ($mission->id === $missionId) {
                return $mission;
            }
        }

        return null;
    }

    public function launch(int $missionId, int $returnGameSecond, int $fuelLoaded, int $ammunitionLoaded, int $windSpeed): void
    {
        $this->database->execute(
            'UPDATE missions SET return_game_second = :return_game_second, fuel_loaded = :fuel_loaded, ammunition_loaded = :ammunition_loaded, wind_speed = :wind_speed WHERE id = :id',
            [
                'return_game_second' => $returnGameSecond,
                'fuel_loaded' => $fuelLoaded,
                'ammunition_loaded' => $ammunitionLoaded,
                'wind_speed' => $windSpeed,
                'id' => $missionId,
            ],
        );
    }

    public function addCrew(int $missionId, int $pilotId, int $aircraftId): void
    {
        $this->database->execute(
            'INSERT INTO mission_crews (pilot_id, aircraft_id, mission_id) VALUES (:pilot_id, :aircraft_id, :mission_id)',
            ['pilot_id' => $pilotId, 'aircraft_id' => $aircraftId, 'mission_id' => $missionId],
        );
    }

    /**
     * @param int $gameSeconds the game time now, which the return of each flight is counted against
     * @return list<Flight> the missions launched, the first back first
     */
    public function flightsOf(int $playerId, int $gameSeconds): array
    {
        $rows = $this->database->fetchAll(
            'SELECT ' . self::MISSION_COLUMNS . ', fuel_loaded, ammunition_loaded, wind_speed, return_game_second
             FROM missions WHERE player_id = :player_id AND return_game_second IS NOT NULL ORDER BY return_game_second, id',
            ['player_id' => $playerId],
        );
        $crewRows = $this->database->fetchAll(
            'SELECT mission_crews.mission_id, mission_crews.pilot_id, mission_crews.aircraft_id
             FROM mission_crews JOIN missions ON missions.id = mission_crews.mission_id
             WHERE missions.player_id = :player_id ORDER BY mission_crews.pilot_id',
            ['player_id' => $playerId],
        );
        $crewsByMission = [];
        foreach ($crewRows as $crewRow) {
            $crewsByMission[(int) $crewRow['mission_id']][] = ['pilotId' => (int) $crewRow['pilot_id'], 'aircraftId' => (int) $crewRow['aircraft_id']];
        }

        $flights = [];
        foreach ($rows as $row) {
            $mission = $this->missionFrom($row);
            $flights[] = new Flight(
                $mission,
                (int) $row['fuel_loaded'],
                (int) $row['ammunition_loaded'],
                (int) $row['wind_speed'],
                max(0, (int) $row['return_game_second'] - $gameSeconds),
                $crewsByMission[$mission->id] ?? [],
            );
        }

        return $flights;
    }

    public function flight(int $playerId, int $missionId, int $gameSeconds): ?Flight
    {
        foreach ($this->flightsOf($playerId, $gameSeconds) as $flight) {
            if ($flight->mission->id === $missionId) {
                return $flight;
            }
        }

        return null;
    }

    public function addReport(int $playerId, MissionReport $report): void
    {
        $this->database->execute(
            'INSERT INTO mission_reports (player_id, report) VALUES (:player_id, :report)',
            ['player_id' => $playerId, 'report' => json_encode($report->toArray(), JSON_THROW_ON_ERROR)],
        );
    }

    /**
     * @return list<array<string, mixed>> the latest reports, the newest first, each with its id
     */
    public function reportsOf(int $playerId, int $limit): array
    {
        $rows = $this->database->fetchAll(
            'SELECT id, report FROM mission_reports WHERE player_id = :player_id ORDER BY id DESC LIMIT ' . $limit,
            ['player_id' => $playerId],
        );
        $reports = [];
        foreach ($rows as $row) {
            $reports[] = ['id' => (int) $row['id'], ...json_decode((string) $row['report'], true, flags: JSON_THROW_ON_ERROR)];
        }

        return $reports;
    }

    /**
     * Takes a mission off the books; its crews go with it, so its pilots and aircraft are free again.
     */
    public function remove(int $missionId): void
    {
        $this->database->execute('DELETE FROM missions WHERE id = :id', ['id' => $missionId]);
    }

    /**
     * @param array<string, scalar|null> $row
     */
    private function missionFrom(array $row): Mission
    {
        return new Mission(
            (int) $row['id'],
            MissionType::from((string) $row['type']),
            (int) $row['aircraft_count'],
            (int) $row['duration_seconds'],
            (int) $row['fuel_per_aircraft'],
            (int) $row['ammunition_per_aircraft'],
            (int) $row['risk'],
            (int) $row['reward_supplies'],
            (int) $row['reward_command_points'],
        );
    }
}
