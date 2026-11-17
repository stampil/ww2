<?php

declare(strict_types=1);

namespace Ww2\Base;

use Ww2\Database\Database;
use Ww2\Squadron\SquadronFounder;

/**
 * The upgrades of a base, bought with command points, level by level: one more bench at the workshop, more room in the warehouse,
 * one more aircraft at the hangar. Each level costs more than the last. The figures are mine.
 */
final class Upgrades
{
    private const MAX_LEVEL = 3;
    private const COST_PER_LEVEL = 4;

    public function __construct(
        private readonly Database $database,
        private readonly BaseStore $bases,
        private readonly SquadronFounder $squadron,
    ) {
    }

    public function levelOf(int $baseId, Upgrade $upgrade): int
    {
        $rows = $this->database->fetchAll(
            'SELECT level FROM base_upgrades WHERE base_id = :base_id AND upgrade = :upgrade',
            ['base_id' => $baseId, 'upgrade' => $upgrade->value],
        );

        return $rows === [] ? 0 : (int) $rows[0]['level'];
    }

    /**
     * @return list<array{upgrade: string, level: int, maxLevel: int, cost: int|null}> the cost is null once the top level is reached
     */
    public function describe(int $baseId): array
    {
        $described = [];
        foreach (Upgrade::cases() as $upgrade) {
            $level = $this->levelOf($baseId, $upgrade);
            $described[] = [
                'upgrade' => $upgrade->value,
                'level' => $level,
                'maxLevel' => self::MAX_LEVEL,
                'cost' => $level < self::MAX_LEVEL ? $this->costOf($level) : null,
            ];
        }

        return $described;
    }

    /**
     * @throws BaseException when the top level is reached already, or the command points run short
     */
    public function buy(int $baseId, Upgrade $upgrade): void
    {
        $this->database->transaction(function () use ($baseId, $upgrade): void {
            $resources = $this->bases->lockResources($baseId);
            $level = $this->levelOf($baseId, $upgrade);
            if ($level >= self::MAX_LEVEL) {
                throw new BaseException(BaseError::UpgradeAtMaximum);
            }
            $cost = $this->costOf($level);
            if ($resources->commandPoints < $cost) {
                throw new BaseException(BaseError::InsufficientCommandPoints);
            }
            $this->bases->spendCommandPoints($baseId, $cost);
            $this->database->execute(
                'INSERT INTO base_upgrades (base_id, upgrade, level) VALUES (:base_id, :upgrade, 1) ON DUPLICATE KEY UPDATE level = level + 1',
                ['base_id' => $baseId, 'upgrade' => $upgrade->value],
            );
            if ($upgrade === Upgrade::Hangar) {
                $this->squadron->addStartingAircraft($baseId);
            }
        });
    }

    private function costOf(int $level): int
    {
        return self::COST_PER_LEVEL * ($level + 1);
    }
}
