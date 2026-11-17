<?php

declare(strict_types=1);

namespace Ww2\Base;

use Ww2\Database\Database;

/**
 * Keeps the state of the aircraft that the hangar looks after: destroyed modules, repairs under way, fires.
 */
final class HangarStore
{
    public function __construct(private readonly Database $database)
    {
    }

    public function destroyModule(int $aircraftId, SparePart $part): void
    {
        $this->database->execute(
            'INSERT INTO destroyed_modules (aircraft_id, part) VALUES (:aircraft_id, :part)',
            ['aircraft_id' => $aircraftId, 'part' => $part->value],
        );
    }

    public function clearModules(int $aircraftId): void
    {
        $this->database->execute('DELETE FROM destroyed_modules WHERE aircraft_id = :aircraft_id', ['aircraft_id' => $aircraftId]);
    }

    /**
     * @return array<int, list<SparePart>> the destroyed modules of the aircraft that have some, by the id of the aircraft
     */
    public function destroyedModulesOf(int $playerId): array
    {
        $rows = $this->database->fetchAll(
            'SELECT destroyed_modules.aircraft_id, destroyed_modules.part
             FROM destroyed_modules JOIN aircraft ON aircraft.id = destroyed_modules.aircraft_id
             WHERE aircraft.player_id = :player_id ORDER BY destroyed_modules.part',
            ['player_id' => $playerId],
        );
        $modules = [];
        foreach ($rows as $row) {
            $modules[(int) $row['aircraft_id']][] = SparePart::from((string) $row['part']);
        }

        return $modules;
    }

    public function startRepair(int $aircraftId, int $finishGameSecond): void
    {
        $this->database->execute(
            'INSERT INTO repairs (aircraft_id, finish_game_second) VALUES (:aircraft_id, :finish_game_second)',
            ['aircraft_id' => $aircraftId, 'finish_game_second' => $finishGameSecond],
        );
    }

    public function finishRepair(int $aircraftId): void
    {
        $this->database->execute('DELETE FROM repairs WHERE aircraft_id = :aircraft_id', ['aircraft_id' => $aircraftId]);
    }

    /**
     * @return array<int, int> the game second at which each repair is done, by the id of the aircraft
     */
    public function repairsOf(int $playerId): array
    {
        $rows = $this->database->fetchAll(
            'SELECT repairs.aircraft_id, repairs.finish_game_second
             FROM repairs JOIN aircraft ON aircraft.id = repairs.aircraft_id WHERE aircraft.player_id = :player_id',
            ['player_id' => $playerId],
        );
        $repairs = [];
        foreach ($rows as $row) {
            $repairs[(int) $row['aircraft_id']] = (int) $row['finish_game_second'];
        }

        return $repairs;
    }

    public function runningRepairCount(int $playerId, int $gameSeconds): int
    {
        $count = 0;
        foreach ($this->repairsOf($playerId) as $finishGameSecond) {
            if ($finishGameSecond > $gameSeconds) {
                $count += 1;
            }
        }

        return $count;
    }

    public function ignite(int $aircraftId, int $pilotId, int $explodesAtGameSecond): void
    {
        $this->database->execute(
            'INSERT INTO burning_aircraft (aircraft_id, pilot_id, explodes_at_game_second) VALUES (:aircraft_id, :pilot_id, :explodes_at_game_second)',
            ['aircraft_id' => $aircraftId, 'pilot_id' => $pilotId, 'explodes_at_game_second' => $explodesAtGameSecond],
        );
    }

    public function extinguish(int $aircraftId): void
    {
        $this->database->execute('DELETE FROM burning_aircraft WHERE aircraft_id = :aircraft_id', ['aircraft_id' => $aircraftId]);
    }

    /**
     * @return array<int, array{pilotId: int|null, explodesAt: int}> the fires, by the id of the aircraft; the pilot aboard is null when they are gone
     */
    public function firesOf(int $playerId): array
    {
        $rows = $this->database->fetchAll(
            'SELECT burning_aircraft.aircraft_id, burning_aircraft.pilot_id, burning_aircraft.explodes_at_game_second
             FROM burning_aircraft JOIN aircraft ON aircraft.id = burning_aircraft.aircraft_id WHERE aircraft.player_id = :player_id',
            ['player_id' => $playerId],
        );
        $fires = [];
        foreach ($rows as $row) {
            $fires[(int) $row['aircraft_id']] = [
                'pilotId' => $row['pilot_id'] === null ? null : (int) $row['pilot_id'],
                'explodesAt' => (int) $row['explodes_at_game_second'],
            ];
        }

        return $fires;
    }

    /**
     * @return list<int> the aircraft that cannot take off: with a destroyed module, under repair, or on fire
     */
    public function groundedAircraftIds(int $playerId): array
    {
        $rows = $this->database->fetchAll(
            'SELECT id FROM aircraft WHERE player_id = :player_id AND (
                id IN (SELECT aircraft_id FROM destroyed_modules)
                OR id IN (SELECT aircraft_id FROM repairs)
                OR id IN (SELECT aircraft_id FROM burning_aircraft)
             )',
            ['player_id' => $playerId],
        );

        return array_map(static fn (array $row): int => (int) $row['id'], $rows);
    }
}
