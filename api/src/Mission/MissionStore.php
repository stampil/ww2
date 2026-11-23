<?php

declare(strict_types=1);

namespace Ww2\Mission;

use Ww2\Database\Database;

/**
 * Keeps the missions of the bases in the database: on the table until launched, under way until the squadron is received.
 */
final class MissionStore
{
    private const MISSION_COLUMNS = 'id, type, aircraft_count, duration_seconds, fuel_per_aircraft, ammunition_per_aircraft, risk, reward_supplies, reward_command_points';

    public function __construct(private readonly Database $database)
    {
    }

    public function addOffer(int $baseId, Mission $mission): void
    {
        $this->database->execute(
            'INSERT INTO missions (base_id, type, aircraft_count, duration_seconds, fuel_per_aircraft, ammunition_per_aircraft, risk, reward_supplies, reward_command_points)
             VALUES (:base_id, :type, :aircraft_count, :duration_seconds, :fuel_per_aircraft, :ammunition_per_aircraft, :risk, :reward_supplies, :reward_command_points)',
            [
                'base_id' => $baseId,
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
     * Puts an attack on the books against an enemy camp, not launched yet.
     *
     * @return int the id of the mission
     */
    public function addAttack(int $baseId, Mission $mission, int $targetBaseId): int
    {
        $this->addOffer($baseId, $mission);
        $missionId = (int) $this->database->fetchAll('SELECT LAST_INSERT_ID() AS id')[0]['id'];
        $this->database->execute('INSERT INTO mission_targets (mission_id, target_base_id) VALUES (:mission_id, :target_base_id)', ['mission_id' => $missionId, 'target_base_id' => $targetBaseId]);

        return $missionId;
    }

    /**
     * @return list<Mission> the missions not launched yet, the oldest first
     */
    public function offersOf(int $baseId): array
    {
        $rows = $this->database->fetchAll(
            'SELECT ' . self::MISSION_COLUMNS . ' FROM missions WHERE base_id = :base_id AND return_game_second IS NULL ORDER BY id',
            ['base_id' => $baseId],
        );

        return array_map($this->missionFrom(...), $rows);
    }

    public function offer(int $baseId, int $missionId): ?Mission
    {
        foreach ($this->offersOf($baseId) as $mission) {
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
    public function flightsOf(int $baseId, int $gameSeconds): array
    {
        $rows = $this->database->fetchAll(
            'SELECT missions.id, type, aircraft_count, duration_seconds, fuel_per_aircraft, ammunition_per_aircraft, risk, reward_supplies, reward_command_points,
                    fuel_loaded, ammunition_loaded, wind_speed, return_game_second, mission_targets.target_base_id AS target_base_id, target_bases.site AS target_site
             FROM missions LEFT JOIN mission_targets ON mission_targets.mission_id = missions.id LEFT JOIN bases AS target_bases ON target_bases.id = mission_targets.target_base_id
             WHERE missions.base_id = :base_id AND return_game_second IS NOT NULL ORDER BY return_game_second, missions.id',
            ['base_id' => $baseId],
        );
        $crewRows = $this->database->fetchAll(
            'SELECT mission_crews.mission_id, mission_crews.pilot_id, mission_crews.aircraft_id
             FROM mission_crews JOIN missions ON missions.id = mission_crews.mission_id
             WHERE missions.base_id = :base_id ORDER BY mission_crews.pilot_id',
            ['base_id' => $baseId],
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
                $row['target_base_id'] === null ? null : (int) $row['target_base_id'],
                $row['target_site'] === null ? null : (string) $row['target_site'],
            );
        }

        return $flights;
    }

    public function flight(int $baseId, int $missionId, int $gameSeconds): ?Flight
    {
        foreach ($this->flightsOf($baseId, $gameSeconds) as $flight) {
            if ($flight->mission->id === $missionId) {
                return $flight;
            }
        }

        return null;
    }

    public function isOnFlight(int $aircraftId): bool
    {
        $rows = $this->database->fetchAll('SELECT COUNT(*) AS total FROM mission_crews WHERE aircraft_id = :aircraft_id', ['aircraft_id' => $aircraftId]);

        return (int) $rows[0]['total'] > 0;
    }

    public function isPilotOnFlight(int $pilotId): bool
    {
        $rows = $this->database->fetchAll('SELECT COUNT(*) AS total FROM mission_crews WHERE pilot_id = :pilot_id', ['pilot_id' => $pilotId]);

        return (int) $rows[0]['total'] > 0;
    }

    /**
     * Takes a mission off the books; its crews go with it, so its pilots and aircraft are free again.
     */
    public function remove(int $missionId): void
    {
        $this->database->execute('DELETE FROM missions WHERE id = :id', ['id' => $missionId]);
    }

    /**
     * Takes every mission of a base off the books, those on the table and those under way, with their crews.
     */
    public function removeAllOf(int $baseId): void
    {
        $this->database->execute('DELETE FROM missions WHERE base_id = :base_id', ['base_id' => $baseId]);
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
