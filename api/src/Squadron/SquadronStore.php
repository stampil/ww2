<?php

declare(strict_types=1);

namespace Ww2\Squadron;

use Ww2\Database\Database;
use Ww2\World\Clan;
use Ww2\World\Site;

/**
 * Keeps the pilots and the aircraft of the squadrons in the database.
 */
final class SquadronStore
{
    public function __construct(private readonly Database $database)
    {
    }

    /**
     * @throws SquadronException when the game has no such aircraft type
     */
    public function modelByCode(string $code): AircraftModel
    {
        $rows = $this->database->fetchAll(
            'SELECT id, code, name, category, durability, maneuverability, fuel_capacity, ammunition_capacity FROM aircraft_models WHERE code = :code',
            ['code' => $code],
        );
        if ($rows === []) {
            throw new SquadronException('Unknown aircraft type ' . $code);
        }

        return $this->modelFrom($rows[0]);
    }

    public function addPilot(int $baseId, Pilot $pilot): void
    {
        $this->database->execute(
            'INSERT INTO pilots (base_id, name, pilot_rank, fatigue, stress, accuracy, resilience)
             VALUES (:base_id, :name, :pilot_rank, :fatigue, :stress, :accuracy, :resilience)',
            [
                'base_id' => $baseId,
                'name' => $pilot->name,
                'pilot_rank' => $pilot->rank,
                'fatigue' => $pilot->fatigue,
                'stress' => $pilot->stress,
                'accuracy' => $pilot->accuracy,
                'resilience' => $pilot->resilience,
            ],
        );
    }

    /**
     * Adds an aircraft to the base, painted in a livery, with the next number: one more than the highest the base has used, so a number is never given twice.
     */
    public function addAircraft(int $baseId, AircraftModel $model, Livery $livery): void
    {
        $nextNumber = $this->nextNumberOf($baseId);
        $this->database->execute(
            'INSERT INTO aircraft (base_id, model_id, durability) VALUES (:base_id, :model_id, :durability)',
            ['base_id' => $baseId, 'model_id' => $model->id, 'durability' => $model->durability],
        );
        $this->database->execute(
            'INSERT INTO aircraft_numbers (aircraft_id, number)
             SELECT aircraft.id, :number FROM aircraft
             LEFT JOIN aircraft_numbers ON aircraft_numbers.aircraft_id = aircraft.id
             WHERE aircraft.base_id = :base_id AND aircraft_numbers.aircraft_id IS NULL',
            ['number' => $nextNumber, 'base_id' => $baseId],
        );
        $this->database->execute(
            'INSERT INTO aircraft_liveries (aircraft_id, livery)
             SELECT aircraft.id, :livery FROM aircraft
             LEFT JOIN aircraft_liveries ON aircraft_liveries.aircraft_id = aircraft.id
             WHERE aircraft.base_id = :base_id AND aircraft_liveries.aircraft_id IS NULL',
            ['livery' => $livery->value, 'base_id' => $baseId],
        );
        $this->database->execute(
            'INSERT INTO aircraft_commissions (aircraft_id, commissioned_epoch)
             SELECT aircraft.id, UNIX_TIMESTAMP() FROM aircraft
             LEFT JOIN aircraft_commissions ON aircraft_commissions.aircraft_id = aircraft.id
             WHERE aircraft.base_id = :base_id AND aircraft_commissions.aircraft_id IS NULL',
            ['base_id' => $baseId],
        );
    }

    /**
     * The side of a base, which is the side of its site.
     */
    public function clanOf(int $baseId): Clan
    {
        $rows = $this->database->fetchAll('SELECT site FROM bases WHERE id = :base_id', ['base_id' => $baseId]);

        return Site::from((string) $rows[0]['site'])->clan();
    }

    /**
     * Moves a pilot to another base. The caller holds the transaction and has checked that the pilot is free.
     */
    public function movePilot(int $pilotId, int $toBaseId): void
    {
        $this->database->execute('UPDATE pilots SET base_id = :base_id WHERE id = :id', ['base_id' => $toBaseId, 'id' => $pilotId]);
    }

    /**
     * Moves an aircraft to another base, where it takes the next number, as a number is never given twice in a base. The caller holds the transaction and has checked that the aircraft is free.
     */
    public function moveAircraft(int $aircraftId, int $toBaseId): void
    {
        $nextNumber = $this->nextNumberOf($toBaseId);
        $this->database->execute('UPDATE aircraft SET base_id = :base_id WHERE id = :id', ['base_id' => $toBaseId, 'id' => $aircraftId]);
        $this->database->execute('UPDATE aircraft_numbers SET number = :number WHERE aircraft_id = :id', ['number' => $nextNumber, 'id' => $aircraftId]);
    }

    private function nextNumberOf(int $baseId): int
    {
        $rows = $this->database->fetchAll(
            'SELECT COALESCE(MAX(numbers.number), 0) + 1 AS next_number FROM aircraft_numbers AS numbers
             JOIN aircraft ON aircraft.id = numbers.aircraft_id WHERE aircraft.base_id = :base_id',
            ['base_id' => $baseId],
        );

        return (int) $rows[0]['next_number'];
    }

    public function updatePilotGauges(int $pilotId, int $fatigue, int $stress): void
    {
        $this->database->execute(
            'UPDATE pilots SET fatigue = :fatigue, stress = :stress WHERE id = :id',
            ['fatigue' => $fatigue, 'stress' => $stress, 'id' => $pilotId],
        );
    }

    public function startRest(int $pilotId, int $finishGameSecond): void
    {
        $this->database->execute(
            'INSERT INTO pilot_rests (pilot_id, finish_game_second) VALUES (:pilot_id, :finish_game_second)',
            ['pilot_id' => $pilotId, 'finish_game_second' => $finishGameSecond],
        );
    }

    public function finishRest(int $pilotId): void
    {
        $this->database->execute('DELETE FROM pilot_rests WHERE pilot_id = :pilot_id', ['pilot_id' => $pilotId]);
    }

    /**
     * @return array<int, int> the game second at which each rest is over, by the id of the pilot
     */
    public function restsOf(int $baseId): array
    {
        $rows = $this->database->fetchAll(
            'SELECT pilot_rests.pilot_id, pilot_rests.finish_game_second
             FROM pilot_rests JOIN pilots ON pilots.id = pilot_rests.pilot_id WHERE pilots.base_id = :base_id',
            ['base_id' => $baseId],
        );
        $rests = [];
        foreach ($rows as $row) {
            $rests[(int) $row['pilot_id']] = (int) $row['finish_game_second'];
        }

        return $rests;
    }

    /**
     * Adds what a flight did to the record of a pilot, and gives the pilot the rank their missions have earned if it is higher than theirs.
     */
    public function recordFlight(int $pilotId, PilotRecord $flight): void
    {
        $this->database->execute(
            'INSERT INTO pilot_records (pilot_id, missions_flown, missions_succeeded, air_combats, victories, ground_successes, aircraft_lost)
             VALUES (:pilot_id, :missions_flown, :missions_succeeded, :air_combats, :victories, :ground_successes, :aircraft_lost)
             ON DUPLICATE KEY UPDATE missions_flown = missions_flown + :added_missions_flown, missions_succeeded = missions_succeeded + :added_missions_succeeded,
                 air_combats = air_combats + :added_air_combats, victories = victories + :added_victories,
                 ground_successes = ground_successes + :added_ground_successes, aircraft_lost = aircraft_lost + :added_aircraft_lost',
            [
                'pilot_id' => $pilotId,
                'missions_flown' => $flight->missionsFlown,
                'missions_succeeded' => $flight->missionsSucceeded,
                'air_combats' => $flight->airCombats,
                'victories' => $flight->victories,
                'ground_successes' => $flight->groundSuccesses,
                'aircraft_lost' => $flight->aircraftLost,
                'added_missions_flown' => $flight->missionsFlown,
                'added_missions_succeeded' => $flight->missionsSucceeded,
                'added_air_combats' => $flight->airCombats,
                'added_victories' => $flight->victories,
                'added_ground_successes' => $flight->groundSuccesses,
                'added_aircraft_lost' => $flight->aircraftLost,
            ],
        );
        foreach ($flight->victoriesOver as $enemy => $victories) {
            $this->database->execute(
                'INSERT INTO pilot_enemy_victories (pilot_id, enemy, victories) VALUES (:pilot_id, :enemy, :victories)
                 ON DUPLICATE KEY UPDATE victories = victories + :added_victories',
                ['pilot_id' => $pilotId, 'enemy' => $enemy, 'victories' => $victories, 'added_victories' => $victories],
            );
        }
        $rows = $this->database->fetchAll('SELECT missions_succeeded FROM pilot_records WHERE pilot_id = :pilot_id', ['pilot_id' => $pilotId]);
        $meritRank = (new PilotRecord(missionsSucceeded: (int) $rows[0]['missions_succeeded']))->meritRank();
        $this->database->execute(
            'UPDATE pilots SET pilot_rank = :merit_rank WHERE id = :id AND pilot_rank < :higher_than',
            ['merit_rank' => $meritRank, 'id' => $pilotId, 'higher_than' => $meritRank],
        );
    }

    /**
     * Takes a pilot who died out of the squadron and writes them in the memorial of their base.
     */
    public function bury(int $pilotId): void
    {
        $this->database->execute(
            'INSERT INTO fallen_pilots (base_id, name, pilot_rank, missions_flown, missions_succeeded, air_combats, victories, ground_successes, aircraft_lost)
             SELECT pilots.base_id, pilots.name, pilots.pilot_rank, COALESCE(records.missions_flown, 0), COALESCE(records.missions_succeeded, 0), COALESCE(records.air_combats, 0),
                    COALESCE(records.victories, 0), COALESCE(records.ground_successes, 0), COALESCE(records.aircraft_lost, 0)
             FROM pilots LEFT JOIN pilot_records AS records ON records.pilot_id = pilots.id WHERE pilots.id = :id',
            ['id' => $pilotId],
        );
        $this->database->execute('DELETE FROM pilots WHERE id = :id', ['id' => $pilotId]);
    }

    /**
     * @return list<FallenPilot> the pilots of the base who died, the first to fall first
     */
    public function fallenOf(int $baseId): array
    {
        $rows = $this->database->fetchAll(
            'SELECT name, pilot_rank, missions_flown, missions_succeeded, air_combats, victories, ground_successes, aircraft_lost FROM fallen_pilots WHERE base_id = :base_id ORDER BY id',
            ['base_id' => $baseId],
        );

        return array_map(
            static fn (array $row): FallenPilot => new FallenPilot((string) $row['name'], (int) $row['pilot_rank'], self::recordFrom($row)),
            $rows,
        );
    }

    public function setAircraftDurability(int $aircraftId, int $durability): void
    {
        $this->database->execute('UPDATE aircraft SET durability = :durability WHERE id = :id', ['durability' => $durability, 'id' => $aircraftId]);
    }

    public function removeAircraft(int $aircraftId): void
    {
        $this->database->execute('DELETE FROM aircraft WHERE id = :id', ['id' => $aircraftId]);
    }

    /**
     * Destroys an aircraft: it leaves the squadron but keeps its place in the hangar, as a wreck with its number, its livery and its day of making.
     */
    public function destroyAircraft(int $aircraftId): void
    {
        $this->database->execute(
            'INSERT INTO aircraft_wrecks (base_id, model_id, livery, number, commissioned_epoch)
             SELECT aircraft.base_id, aircraft.model_id, aircraft_liveries.livery, aircraft_numbers.number, aircraft_commissions.commissioned_epoch
             FROM aircraft
             JOIN aircraft_liveries ON aircraft_liveries.aircraft_id = aircraft.id
             JOIN aircraft_numbers ON aircraft_numbers.aircraft_id = aircraft.id
             JOIN aircraft_commissions ON aircraft_commissions.aircraft_id = aircraft.id
             WHERE aircraft.id = :id',
            ['id' => $aircraftId],
        );
        $this->removeAircraft($aircraftId);
    }

    /**
     * Puts a wreck back in the squadron as an aircraft in one piece, with the number, the livery and the day of making it had.
     */
    public function restoreAircraft(int $wreckId): void
    {
        $this->database->execute(
            'INSERT INTO aircraft (base_id, model_id, durability)
             SELECT wrecks.base_id, wrecks.model_id, models.durability FROM aircraft_wrecks AS wrecks
             JOIN aircraft_models AS models ON models.id = wrecks.model_id WHERE wrecks.id = :id',
            ['id' => $wreckId],
        );
        $aircraftId = (int) $this->database->fetchAll('SELECT LAST_INSERT_ID() AS id')[0]['id'];
        $this->database->execute(
            'INSERT INTO aircraft_numbers (aircraft_id, number) SELECT :aircraft_id, number FROM aircraft_wrecks WHERE id = :id',
            ['aircraft_id' => $aircraftId, 'id' => $wreckId],
        );
        $this->database->execute(
            'INSERT INTO aircraft_liveries (aircraft_id, livery) SELECT :aircraft_id, livery FROM aircraft_wrecks WHERE id = :id',
            ['aircraft_id' => $aircraftId, 'id' => $wreckId],
        );
        $this->database->execute(
            'INSERT INTO aircraft_commissions (aircraft_id, commissioned_epoch) SELECT :aircraft_id, commissioned_epoch FROM aircraft_wrecks WHERE id = :id',
            ['aircraft_id' => $aircraftId, 'id' => $wreckId],
        );
        $this->database->execute('DELETE FROM aircraft_wrecks WHERE id = :id', ['id' => $wreckId]);
    }

    public function clearWrecks(int $baseId): void
    {
        $this->database->execute('DELETE FROM aircraft_wrecks WHERE base_id = :base_id', ['base_id' => $baseId]);
    }

    /**
     * @return list<AircraftWreck> the wrecks of the base, the first destroyed first
     */
    public function wrecksOf(int $baseId): array
    {
        $rows = $this->database->fetchAll(
            'SELECT wrecks.id, wrecks.livery, wrecks.number, wrecks.commissioned_epoch, models.id AS model_id, models.code, models.name, models.category,
                    models.durability, models.maneuverability, models.fuel_capacity, models.ammunition_capacity
             FROM aircraft_wrecks AS wrecks JOIN aircraft_models AS models ON models.id = wrecks.model_id
             WHERE wrecks.base_id = :base_id ORDER BY wrecks.id',
            ['base_id' => $baseId],
        );

        return array_map(
            fn (array $row): AircraftWreck => new AircraftWreck(
                (int) $row['id'],
                $this->modelFrom([...$row, 'id' => $row['model_id']]),
                Livery::from((string) $row['livery']),
                (int) $row['number'],
                (int) $row['commissioned_epoch'],
            ),
            $rows,
        );
    }

    /**
     * @return int how many places of the hangar are taken: the aircraft that stand there and the wrecks that wait to be rebuilt
     */
    public function placesTakenAt(int $baseId): int
    {
        return count($this->aircraftOf($baseId)) + count($this->wrecksOf($baseId));
    }

    /**
     * @return list<Mechanic> the mechanics of the base
     */
    public function mechanicsOf(int $baseId): array
    {
        $rows = $this->database->fetchAll('SELECT id, skill FROM mechanics WHERE base_id = :base_id ORDER BY id', ['base_id' => $baseId]);

        return array_map(static fn (array $row): Mechanic => new Mechanic((int) $row['id'], (int) $row['skill']), $rows);
    }

    public function addMechanic(int $baseId, int $skill): void
    {
        $this->database->execute('INSERT INTO mechanics (base_id, skill) VALUES (:base_id, :skill)', ['base_id' => $baseId, 'skill' => $skill]);
    }

    /**
     * @return list<Pilot>
     */
    public function pilotsOf(int $baseId): array
    {
        $rows = $this->database->fetchAll(
            'SELECT pilots.id, pilots.name, pilots.pilot_rank, pilots.fatigue, pilots.stress, pilots.accuracy, pilots.resilience,
                    COALESCE(records.missions_flown, 0) AS missions_flown, COALESCE(records.missions_succeeded, 0) AS missions_succeeded, COALESCE(records.air_combats, 0) AS air_combats,
                    COALESCE(records.victories, 0) AS victories, COALESCE(records.ground_successes, 0) AS ground_successes, COALESCE(records.aircraft_lost, 0) AS aircraft_lost
             FROM pilots LEFT JOIN pilot_records AS records ON records.pilot_id = pilots.id WHERE pilots.base_id = :base_id ORDER BY pilots.id',
            ['base_id' => $baseId],
        );
        $victoriesOver = $this->victoriesOverOf($baseId);

        return array_map(
            static fn (array $row): Pilot => new Pilot(
                (int) $row['id'],
                (string) $row['name'],
                (int) $row['pilot_rank'],
                (int) $row['fatigue'],
                (int) $row['stress'],
                (int) $row['accuracy'],
                (int) $row['resilience'],
                self::recordFrom($row, $victoriesOver[(int) $row['id']] ?? []),
            ),
            $rows,
        );
    }

    /**
     * @return array<int, array<string, int>> the victories of each pilot of the base over each type of enemy, by the id of the pilot and the name of the type
     */
    private function victoriesOverOf(int $baseId): array
    {
        $rows = $this->database->fetchAll(
            'SELECT pilot_enemy_victories.pilot_id, pilot_enemy_victories.enemy, pilot_enemy_victories.victories
             FROM pilot_enemy_victories JOIN pilots ON pilots.id = pilot_enemy_victories.pilot_id WHERE pilots.base_id = :base_id',
            ['base_id' => $baseId],
        );
        $victoriesOver = [];
        foreach ($rows as $row) {
            $victoriesOver[(int) $row['pilot_id']][(string) $row['enemy']] = (int) $row['victories'];
        }

        return $victoriesOver;
    }

    /**
     * @param array<string, scalar|null> $row
     * @param array<string, int> $victoriesOver
     */
    private static function recordFrom(array $row, array $victoriesOver = []): PilotRecord
    {
        return new PilotRecord(
            (int) $row['missions_flown'],
            (int) $row['missions_succeeded'],
            (int) $row['air_combats'],
            (int) $row['victories'],
            (int) $row['ground_successes'],
            (int) $row['aircraft_lost'],
            $victoriesOver,
        );
    }

    /**
     * @return array<int, Pilot> the pilots of the base, by id
     */
    public function pilotsById(int $baseId): array
    {
        $pilots = [];
        foreach ($this->pilotsOf($baseId) as $pilot) {
            $pilots[$pilot->id] = $pilot;
        }

        return $pilots;
    }

    /**
     * @return array<int, Aircraft> the aircraft of the base, by id
     */
    public function aircraftById(int $baseId): array
    {
        $aircraft = [];
        foreach ($this->aircraftOf($baseId) as $owned) {
            $aircraft[$owned->id] = $owned;
        }

        return $aircraft;
    }

    /**
     * @return list<Aircraft>
     */
    public function aircraftOf(int $baseId): array
    {
        $rows = $this->database->fetchAll(
            'SELECT aircraft.id, aircraft.durability AS current_durability, aircraft_numbers.number, aircraft_liveries.livery, aircraft_commissions.commissioned_epoch, models.id AS model_id, models.code, models.name, models.category,
                    models.durability, models.maneuverability, models.fuel_capacity, models.ammunition_capacity
             FROM aircraft
             JOIN aircraft_models AS models ON models.id = aircraft.model_id
             JOIN aircraft_numbers ON aircraft_numbers.aircraft_id = aircraft.id
             JOIN aircraft_liveries ON aircraft_liveries.aircraft_id = aircraft.id
             JOIN aircraft_commissions ON aircraft_commissions.aircraft_id = aircraft.id
             WHERE aircraft.base_id = :base_id
             ORDER BY aircraft.id',
            ['base_id' => $baseId],
        );

        return array_map(
            fn (array $row): Aircraft => new Aircraft(
                (int) $row['id'],
                $this->modelFrom([...$row, 'id' => $row['model_id']]),
                Livery::from((string) $row['livery']),
                (int) $row['current_durability'],
                (int) $row['number'],
                (int) $row['commissioned_epoch'],
            ),
            $rows,
        );
    }

    /**
     * @param array<string, scalar|null> $row
     */
    private function modelFrom(array $row): AircraftModel
    {
        return new AircraftModel(
            (int) $row['id'],
            (string) $row['code'],
            (string) $row['name'],
            AircraftCategory::from((string) $row['category']),
            (int) $row['durability'],
            (int) $row['maneuverability'],
            (int) $row['fuel_capacity'],
            (int) $row['ammunition_capacity'],
        );
    }
}
