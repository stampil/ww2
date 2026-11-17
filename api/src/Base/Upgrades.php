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

    public function levelOf(int $playerId, Upgrade $upgrade): int
    {
        $rows = $this->database->fetchAll(
            'SELECT level FROM base_upgrades WHERE player_id = :player_id AND upgrade = :upgrade',
            ['player_id' => $playerId, 'upgrade' => $upgrade->value],
        );

        return $rows === [] ? 0 : (int) $rows[0]['level'];
    }

    /**
     * @return list<array{upgrade: string, level: int, maxLevel: int, cost: int|null}> the cost is null once the top level is reached
     */
    public function describe(int $playerId): array
    {
        $described = [];
        foreach (Upgrade::cases() as $upgrade) {
            $level = $this->levelOf($playerId, $upgrade);
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
    public function buy(int $playerId, Upgrade $upgrade): void
    {
        $this->database->transaction(function () use ($playerId, $upgrade): void {
            $resources = $this->bases->lockResources($playerId);
            $level = $this->levelOf($playerId, $upgrade);
            if ($level >= self::MAX_LEVEL) {
                throw new BaseException(BaseError::UpgradeAtMaximum);
            }
            $cost = $this->costOf($level);
            if ($resources->commandPoints < $cost) {
                throw new BaseException(BaseError::InsufficientCommandPoints);
            }
            $this->bases->spendCommandPoints($playerId, $cost);
            $this->database->execute(
                'INSERT INTO base_upgrades (player_id, upgrade, level) VALUES (:player_id, :upgrade, 1) ON DUPLICATE KEY UPDATE level = level + 1',
                ['player_id' => $playerId, 'upgrade' => $upgrade->value],
            );
            if ($upgrade === Upgrade::Hangar) {
                $this->squadron->addStartingAircraft($playerId);
            }
        });
    }

    private function costOf(int $level): int
    {
        return self::COST_PER_LEVEL * ($level + 1);
    }
}
