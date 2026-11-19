<?php

declare(strict_types=1);

namespace Ww2\Base;

use LogicException;
use Ww2\Database\Database;

/**
 * Keeps the resources and the production jobs of the bases in the database, and the terrain plan of each base.
 */
final class BaseStore
{
    public function __construct(private readonly Database $database)
    {
    }

    public function add(int $baseId, BaseResources $resources): void
    {
        $this->database->execute(
            'INSERT INTO base_resources (base_id, supplies, fuel, ammunition, materials, command_points)
             VALUES (:base_id, :supplies, :fuel, :ammunition, :materials, :command_points)',
            [
                'base_id' => $baseId,
                'supplies' => $resources->supplies,
                'fuel' => $resources->fuel,
                'ammunition' => $resources->ammunition,
                'materials' => $resources->materials,
                'command_points' => $resources->commandPoints,
            ],
        );
    }

    /**
     * Gives the base resources only if it has none yet: a camp that already holds some keeps them.
     */
    public function addIfMissing(int $baseId, BaseResources $resources): void
    {
        $this->database->execute(
            'INSERT INTO base_resources (base_id, supplies, fuel, ammunition, materials, command_points)
             VALUES (:base_id, :supplies, :fuel, :ammunition, :materials, :command_points)
             ON DUPLICATE KEY UPDATE base_id = base_id',
            [
                'base_id' => $baseId,
                'supplies' => $resources->supplies,
                'fuel' => $resources->fuel,
                'ammunition' => $resources->ammunition,
                'materials' => $resources->materials,
                'command_points' => $resources->commandPoints,
            ],
        );
    }

    /**
     * @return string the name of the terrain plan of the base, which the front draws
     */
    public function terrainPlanOf(int $baseId): string
    {
        $rows = $this->database->fetchAll(
            'SELECT plan FROM bases WHERE id = :base_id',
            ['base_id' => $baseId],
        );
        if ($rows === []) {
            throw new LogicException('The base does not exist.');
        }

        return (string) $rows[0]['plan'];
    }

    public function resourcesOf(int $baseId): BaseResources
    {
        return $this->readResources($baseId, '');
    }

    /**
     * Reads the resources and holds them until the end of the transaction, so that two requests cannot spend them twice.
     */
    public function lockResources(int $baseId): BaseResources
    {
        return $this->readResources($baseId, ' FOR UPDATE');
    }

    /**
     * Locks the resources of two bases, the lower id first so that two orders going the other way round cannot wait for each other.
     *
     * @return array<int, BaseResources> the resources of each base, by id
     */
    public function lockBoth(int $firstBaseId, int $secondBaseId): array
    {
        $ids = [$firstBaseId, $secondBaseId];
        sort($ids);
        $locked = [];
        foreach ($ids as $id) {
            $locked[$id] = $this->lockResources($id);
        }

        return $locked;
    }

    public function buy(int $baseId, Stock $stock, int $quantity, int $cost): void
    {
        $this->database->execute(
            'UPDATE base_resources SET supplies = supplies - :cost, ' . $stock->value . ' = ' . $stock->value . ' + :quantity WHERE base_id = :base_id',
            ['cost' => $cost, 'quantity' => $quantity, 'base_id' => $baseId],
        );
    }

    /**
     * Moves a quantity of a resource from one base to another. The caller holds the transaction and has checked the quantities.
     */
    public function transfer(int $fromBaseId, int $toBaseId, Resource $resource, int $quantity): void
    {
        $column = $resource->value;
        $this->database->execute(
            'UPDATE base_resources SET ' . $column . ' = ' . $column . ' - :quantity WHERE base_id = :base_id',
            ['quantity' => $quantity, 'base_id' => $fromBaseId],
        );
        $this->database->execute(
            'UPDATE base_resources SET ' . $column . ' = ' . $column . ' + :quantity WHERE base_id = :base_id',
            ['quantity' => $quantity, 'base_id' => $toBaseId],
        );
    }

    public function spendMaterials(int $baseId, int $amount): void
    {
        $this->database->execute(
            'UPDATE base_resources SET materials = materials - :amount WHERE base_id = :base_id',
            ['amount' => $amount, 'base_id' => $baseId],
        );
    }

    /**
     * Takes one finished part of that kind out of the workshop for a repair.
     *
     * @return bool whether there was one
     */
    public function useReadyPart(int $baseId, SparePart $part, int $gameSeconds): bool
    {
        return $this->database->execute(
            'DELETE FROM production_jobs WHERE base_id = :base_id AND part = :part AND finish_game_second <= :game_seconds LIMIT 1',
            ['base_id' => $baseId, 'part' => $part->value, 'game_seconds' => $gameSeconds],
        ) === 1;
    }

    public function addRewards(int $baseId, int $supplies, int $commandPoints): void
    {
        $this->database->execute(
            'UPDATE base_resources SET supplies = supplies + :supplies, command_points = command_points + :command_points WHERE base_id = :base_id',
            ['supplies' => $supplies, 'command_points' => $commandPoints, 'base_id' => $baseId],
        );
    }

    public function spendCommandPoints(int $baseId, int $amount): void
    {
        $this->database->execute(
            'UPDATE base_resources SET command_points = command_points - :amount WHERE base_id = :base_id',
            ['amount' => $amount, 'base_id' => $baseId],
        );
    }

    public function spendSupplies(int $baseId, int $amount): void
    {
        $this->database->execute(
            'UPDATE base_resources SET supplies = supplies - :amount WHERE base_id = :base_id',
            ['amount' => $amount, 'base_id' => $baseId],
        );
    }

    public function addFuelAndAmmunition(int $baseId, int $fuel, int $ammunition): void
    {
        $this->database->execute(
            'UPDATE base_resources SET fuel = fuel + :fuel, ammunition = ammunition + :ammunition WHERE base_id = :base_id',
            ['fuel' => $fuel, 'ammunition' => $ammunition, 'base_id' => $baseId],
        );
    }

    public function spendFuelAndAmmunition(int $baseId, int $fuel, int $ammunition): void
    {
        $this->database->execute(
            'UPDATE base_resources SET fuel = fuel - :fuel, ammunition = ammunition - :ammunition WHERE base_id = :base_id',
            ['fuel' => $fuel, 'ammunition' => $ammunition, 'base_id' => $baseId],
        );
    }

    public function addJob(int $baseId, SparePart $part, int $finishGameSecond, bool $hasMechanic): void
    {
        $this->database->execute(
            'INSERT INTO production_jobs (base_id, part, has_mechanic, finish_game_second)
             VALUES (:base_id, :part, :has_mechanic, :finish_game_second)',
            ['base_id' => $baseId, 'part' => $part->value, 'has_mechanic' => (int) $hasMechanic, 'finish_game_second' => $finishGameSecond],
        );
    }

    /**
     * @param int $gameSeconds the game time now, which the jobs are counted against
     * @return list<ProductionJob> the parts still being made, the next to finish first
     */
    public function runningJobs(int $baseId, int $gameSeconds): array
    {
        $rows = $this->database->fetchAll(
            'SELECT id, part, has_mechanic, finish_game_second
             FROM production_jobs WHERE base_id = :base_id AND finish_game_second > :game_seconds ORDER BY finish_game_second',
            ['base_id' => $baseId, 'game_seconds' => $gameSeconds],
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
    public function readyParts(int $baseId, int $gameSeconds): array
    {
        $rows = $this->database->fetchAll(
            'SELECT part, COUNT(*) AS total FROM production_jobs
             WHERE base_id = :base_id AND finish_game_second <= :game_seconds GROUP BY part',
            ['base_id' => $baseId, 'game_seconds' => $gameSeconds],
        );
        $ready = array_fill_keys(array_map(static fn (SparePart $part): string => $part->value, SparePart::cases()), 0);
        foreach ($rows as $row) {
            $ready[(string) $row['part']] = (int) $row['total'];
        }

        return $ready;
    }

    private function readResources(int $baseId, string $lock): BaseResources
    {
        $rows = $this->database->fetchAll(
            'SELECT supplies, fuel, ammunition, materials, command_points FROM base_resources WHERE base_id = :base_id' . $lock,
            ['base_id' => $baseId],
        );
        if ($rows === []) {
            throw new LogicException('The base does not exist.');
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
