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
    public function destroyedModulesOf(int $baseId): array
    {
        $rows = $this->database->fetchAll(
            'SELECT destroyed_modules.aircraft_id, destroyed_modules.part
             FROM destroyed_modules JOIN aircraft ON aircraft.id = destroyed_modules.aircraft_id
             WHERE aircraft.base_id = :base_id ORDER BY destroyed_modules.part',
            ['base_id' => $baseId],
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
    public function repairsOf(int $baseId): array
    {
        $rows = $this->database->fetchAll(
            'SELECT repairs.aircraft_id, repairs.finish_game_second
             FROM repairs JOIN aircraft ON aircraft.id = repairs.aircraft_id WHERE aircraft.base_id = :base_id',
            ['base_id' => $baseId],
        );
        $repairs = [];
        foreach ($rows as $row) {
            $repairs[(int) $row['aircraft_id']] = (int) $row['finish_game_second'];
        }

        return $repairs;
    }

    public function runningRepairCount(int $baseId, int $gameSeconds): int
    {
        $count = 0;
        foreach ($this->repairsOf($baseId) as $finishGameSecond) {
            if ($finishGameSecond > $gameSeconds) {
                $count += 1;
            }
        }

        return $count;
    }

    /**
     * Notes that the aircraft came back damaged and must be inspected; an inspection already done or under way starts again.
     */
    public function requireInspection(int $aircraftId): void
    {
        $this->database->execute(
            'INSERT INTO inspections (aircraft_id) VALUES (:aircraft_id) ON DUPLICATE KEY UPDATE finish_game_second = NULL',
            ['aircraft_id' => $aircraftId],
        );
    }

    public function startInspection(int $aircraftId, int $finishGameSecond): void
    {
        $this->database->execute(
            'UPDATE inspections SET finish_game_second = :finish_game_second WHERE aircraft_id = :aircraft_id',
            ['aircraft_id' => $aircraftId, 'finish_game_second' => $finishGameSecond],
        );
    }

    public function finishInspection(int $aircraftId): void
    {
        $this->database->execute('DELETE FROM inspections WHERE aircraft_id = :aircraft_id', ['aircraft_id' => $aircraftId]);
    }

    /**
     * @return array<int, int|null> the aircraft to inspect, by id, with the game second at which the inspection is done, or null when it has not begun
     */
    public function inspectionsOf(int $baseId): array
    {
        $rows = $this->database->fetchAll(
            'SELECT inspections.aircraft_id, inspections.finish_game_second
             FROM inspections JOIN aircraft ON aircraft.id = inspections.aircraft_id WHERE aircraft.base_id = :base_id',
            ['base_id' => $baseId],
        );
        $inspections = [];
        foreach ($rows as $row) {
            $inspections[(int) $row['aircraft_id']] = $row['finish_game_second'] === null ? null : (int) $row['finish_game_second'];
        }

        return $inspections;
    }

    public function runningInspectionCount(int $baseId, int $gameSeconds): int
    {
        $count = 0;
        foreach ($this->inspectionsOf($baseId) as $finishGameSecond) {
            if ($finishGameSecond !== null && $finishGameSecond > $gameSeconds) {
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
    public function firesOf(int $baseId): array
    {
        $rows = $this->database->fetchAll(
            'SELECT burning_aircraft.aircraft_id, burning_aircraft.pilot_id, burning_aircraft.explodes_at_game_second
             FROM burning_aircraft JOIN aircraft ON aircraft.id = burning_aircraft.aircraft_id WHERE aircraft.base_id = :base_id',
            ['base_id' => $baseId],
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
     * @return list<int> the aircraft that cannot take off: to inspect, with a destroyed module, under repair, or on fire
     */
    public function groundedAircraftIds(int $baseId): array
    {
        $rows = $this->database->fetchAll(
            'SELECT id FROM aircraft WHERE base_id = :base_id AND (
                id IN (SELECT aircraft_id FROM inspections)
                OR id IN (SELECT aircraft_id FROM destroyed_modules)
                OR id IN (SELECT aircraft_id FROM repairs)
                OR id IN (SELECT aircraft_id FROM burning_aircraft)
             )',
            ['base_id' => $baseId],
        );

        return array_map(static fn (array $row): int => (int) $row['id'], $rows);
    }
}
