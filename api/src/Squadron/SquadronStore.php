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

    public function addPilot(int $playerId, Pilot $pilot): void
    {
        $this->database->execute(
            'INSERT INTO pilots (player_id, name, pilot_rank, fatigue, stress, accuracy, resilience)
             VALUES (:player_id, :name, :pilot_rank, :fatigue, :stress, :accuracy, :resilience)',
            [
                'player_id' => $playerId,
                'name' => $pilot->name,
                'pilot_rank' => $pilot->rank,
                'fatigue' => $pilot->fatigue,
                'stress' => $pilot->stress,
                'accuracy' => $pilot->accuracy,
                'resilience' => $pilot->resilience,
            ],
        );
    }

    public function addAircraft(int $playerId, AircraftModel $model): void
    {
        $this->database->execute(
            'INSERT INTO aircraft (player_id, model_id, durability) VALUES (:player_id, :model_id, :durability)',
            ['player_id' => $playerId, 'model_id' => $model->id, 'durability' => $model->durability],
        );
    }

    /**
     * @return list<Pilot>
     */
    public function pilotsOf(int $playerId): array
    {
        $rows = $this->database->fetchAll(
            'SELECT id, name, pilot_rank, fatigue, stress, accuracy, resilience FROM pilots WHERE player_id = :player_id ORDER BY id',
            ['player_id' => $playerId],
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
    public function aircraftOf(int $playerId): array
    {
        $rows = $this->database->fetchAll(
            'SELECT aircraft.id, aircraft.durability AS current_durability, models.id AS model_id, models.code, models.name, models.category,
                    models.durability, models.maneuverability, models.fuel_capacity, models.ammunition_capacity
             FROM aircraft
             JOIN aircraft_models AS models ON models.id = aircraft.model_id
             WHERE aircraft.player_id = :player_id
             ORDER BY aircraft.id',
            ['player_id' => $playerId],
        );

        return array_map(
            fn (array $row): Aircraft => new Aircraft(
                (int) $row['id'],
                $this->modelFrom([...$row, 'id' => $row['model_id']]),
                (int) $row['current_durability'],
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
