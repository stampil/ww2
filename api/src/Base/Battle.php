<?php

declare(strict_types=1);

namespace Ww2\Base;

use Ww2\Database\Database;
use Ww2\Squadron\SquadronFounder;
use Ww2\World\Bases;

/**
 * The battle of a player, over all the bases they hold: the enemy aircraft they shot down are a score, and the battle never ends.
 */
final class Battle
{
    public function __construct(
        private readonly Database $database,
        private readonly BattleStore $battles,
        private readonly SquadronFounder $squadronFounder,
        private readonly BaseFounder $baseFounder,
        private readonly Bases $bases,
    ) {
    }

    /**
     * @return array{kills: int}
     */
    public function describe(int $baseId): array
    {
        $kills = 0;
        foreach ($this->heldIdsWith($baseId) as $heldId) {
            $kills += $this->battles->killsOf($heldId);
        }

        return ['kills' => $kills];
    }

    /**
     * Founds the base again, as when it was claimed: the player starts from scratch, and the other bases they hold are given back.
     */
    public function startOver(int $baseId): void
    {
        $this->database->transaction(function () use ($baseId): void {
            foreach ($this->heldIdsWith($baseId) as $heldId) {
                $this->battles->eraseGameOf($heldId);
                if ($heldId !== $baseId) {
                    $this->bases->release($heldId);
                }
            }
            $this->squadronFounder->found($baseId);
            $this->baseFounder->found($baseId);
        });
    }

    /**
     * @return list<int> the bases held by the player who holds this one
     */
    private function heldIdsWith(int $baseId): array
    {
        $ids = [];
        foreach ($this->bases->heldWith($baseId) as $held) {
            $ids[] = $held['id'];
        }

        return $ids;
    }
}
