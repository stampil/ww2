<?php

declare(strict_types=1);

namespace Ww2\Base;

use LogicException;
use Ww2\Database\Database;

/**
 * Keeps the resources, the terrain plan and the production jobs of the bases in the database.
 */
final class BaseStore
{
    public function __construct(private readonly Database $database)
    {
    }

    public function add(int $playerId, BaseResources $resources, string $terrainPlan): void
    {
        $this->database->transaction(function () use ($playerId, $resources, $terrainPlan): void {
            $this->database->execute(
                'INSERT INTO base_resources (player_id, supplies, fuel, ammunition, materials, command_points)
                 VALUES (:player_id, :supplies, :fuel, :ammunition, :materials, :command_points)',
                [
                    'player_id' => $playerId,
                    'supplies' => $resources->supplies,
                    'fuel' => $resources->fuel,
                    'ammunition' => $resources->ammunition,
                    'materials' => $resources->materials,
                    'command_points' => $resources->commandPoints,
                ],
            );
            $this->database->execute(
                'INSERT INTO base_terrains (player_id, plan) VALUES (:player_id, :plan)',
                ['player_id' => $playerId, 'plan' => $terrainPlan],
            );
        });
    }

    /**
     * @return string the name of the terrain plan of the base, which the front draws
     */
    public function terrainPlanOf(int $playerId): string
    {
        $rows = $this->database->fetchAll(
            'SELECT plan FROM base_terrains WHERE player_id = :player_id',
            ['player_id' => $playerId],
        );
        if ($rows === []) {
            throw new LogicException('The player has no base.');
        }

        return (string) $rows[0]['plan'];
    }

    public function resourcesOf(int $playerId): BaseResources
    {
        return $this->readResources($playerId, '');
    }

    /**
     * Reads the resources and holds them until the end of the transaction, so that two requests cannot spend them twice.
     */
    public function lockResources(int $playerId): BaseResources
    {
        return $this->readResources($playerId, ' FOR UPDATE');
    }

    public function buy(int $playerId, Stock $stock, int $quantity, int $cost): void
    {
        $this->database->execute(
            'UPDATE base_resources SET supplies = supplies - :cost, ' . $stock->value . ' = ' . $stock->value . ' + :quantity WHERE player_id = :player_id',
            ['cost' => $cost, 'quantity' => $quantity, 'player_id' => $playerId],
        );
    }

    public function spendMaterials(int $playerId, int $amount): void
    {
        $this->database->execute(
            'UPDATE base_resources SET materials = materials - :amount WHERE player_id = :player_id',
            ['amount' => $amount, 'player_id' => $playerId],
        );
    }

    public function addJob(int $playerId, SparePart $part, int $finishGameSecond, bool $hasMechanic): void
    {
        $this->database->execute(
            'INSERT INTO production_jobs (player_id, part, has_mechanic, finish_game_second)
             VALUES (:player_id, :part, :has_mechanic, :finish_game_second)',
            ['player_id' => $playerId, 'part' => $part->value, 'has_mechanic' => (int) $hasMechanic, 'finish_game_second' => $finishGameSecond],
        );
    }

    /**
     * @param int $gameSeconds the game time now, which the jobs are counted against
     * @return list<ProductionJob> the parts still being made, the next to finish first
     */
    public function runningJobs(int $playerId, int $gameSeconds): array
    {
        $rows = $this->database->fetchAll(
            'SELECT id, part, has_mechanic, finish_game_second
             FROM production_jobs WHERE player_id = :player_id AND finish_game_second > :game_seconds ORDER BY finish_game_second',
            ['player_id' => $playerId, 'game_seconds' => $gameSeconds],
        );

        return array_map(
            static fn (array $row): ProductionJob => new ProductionJob(
                (int) $row['id'],
                SparePart::from((string) $row['part']),
                (int) $row['finish_game_second'] - $gameSeconds,
                (bool) $row['has_mechanic'],
            ),
            $rows,
        );
    }

    /**
     * @param int $gameSeconds the game time now, which the jobs are counted against
     * @return array<string, int> how many parts of each kind are finished, by the name of the part
     */
    public function readyParts(int $playerId, int $gameSeconds): array
    {
        $rows = $this->database->fetchAll(
            'SELECT part, COUNT(*) AS total FROM production_jobs
             WHERE player_id = :player_id AND finish_game_second <= :game_seconds GROUP BY part',
            ['player_id' => $playerId, 'game_seconds' => $gameSeconds],
        );
        $ready = array_fill_keys(array_map(static fn (SparePart $part): string => $part->value, SparePart::cases()), 0);
        foreach ($rows as $row) {
            $ready[(string) $row['part']] = (int) $row['total'];
        }

        return $ready;
    }

    private function readResources(int $playerId, string $lock): BaseResources
    {
        $rows = $this->database->fetchAll(
            'SELECT supplies, fuel, ammunition, materials, command_points FROM base_resources WHERE player_id = :player_id' . $lock,
            ['player_id' => $playerId],
        );
        if ($rows === []) {
            throw new LogicException('The player has no base.');
        }

        return new BaseResources(
            (int) $rows[0]['supplies'],
            (int) $rows[0]['fuel'],
            (int) $rows[0]['ammunition'],
            (int) $rows[0]['materials'],
            (int) $rows[0]['command_points'],
        );
    }
}
