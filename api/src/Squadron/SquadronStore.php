<?php

declare(strict_types=1);

namespace Ww2\Squadron;

use Ww2\Database\Database;

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
     * Adds an aircraft to the base, with the next number: one more than the highest the base has used, so a number is never given twice.
     */
    public function addAircraft(int $baseId, AircraftModel $model): void
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

    public function removePilot(int $pilotId): void
    {
        $this->database->execute('DELETE FROM pilots WHERE id = :id', ['id' => $pilotId]);
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
     * @return list<Pilot>
     */
    public function pilotsOf(int $baseId): array
    {
        $rows = $this->database->fetchAll(
            'SELECT id, name, pilot_rank, fatigue, stress, accuracy, resilience FROM pilots WHERE base_id = :base_id ORDER BY id',
            ['base_id' => $baseId],
        );

        return array_map(
            static fn (array $row): Pilot => new Pilot(
                (int) $row['id'],
                (string) $row['name'],
                (int) $row['pilot_rank'],
                (int) $row['fatigue'],
                (int) $row['stress'],
                (int) $row['accuracy'],
                (int) $row['resilience'],
            ),
            $rows,
        );
    }

    /**
     * @return list<Aircraft>
     */
    public function aircraftOf(int $baseId): array
    {
        $rows = $this->database->fetchAll(
            'SELECT aircraft.id, aircraft.durability AS current_durability, aircraft_numbers.number, models.id AS model_id, models.code, models.name, models.category,
                    models.durability, models.maneuverability, models.fuel_capacity, models.ammunition_capacity
             FROM aircraft
             JOIN aircraft_models AS models ON models.id = aircraft.model_id
             JOIN aircraft_numbers ON aircraft_numbers.aircraft_id = aircraft.id
             WHERE aircraft.base_id = :base_id
             ORDER BY aircraft.id',
            ['base_id' => $baseId],
        );

        return array_map(
            fn (array $row): Aircraft => new Aircraft(
                (int) $row['id'],
                $this->modelFrom([...$row, 'id' => $row['model_id']]),
                (int) $row['current_durability'],
                (int) $row['number'],
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
