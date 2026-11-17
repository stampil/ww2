<?php

declare(strict_types=1);

namespace Ww2\Squadron;

use Random\Randomizer;
use Ww2\Database\Database;

/**
 * Gives a new player a squadron to start with: a few pilots of different ranks and a few D.520.
 */
final class SquadronFounder
{
    private const AIRCRAFT_CODE = 'd520';
    private const AIRCRAFT_COUNT = 3;
    /** @var list<int> the rank of each starting pilot: a sub-lieutenant, two staff sergeants, a sergeant */
    private const PILOT_RANKS = [4, 2, 2, 1];
    private const MIN_SKILL = 40;
    private const MAX_SKILL = 70;
    private const MAX_STARTING_GAUGE = 10;
    private const FIRST_NAMES = ['Jean', 'Pierre', 'Marcel', 'Henri', 'Lucien', 'Paul', 'André', 'Louis', 'Roger', 'Émile'];
    private const LAST_NAMES = ['Dupont', 'Moreau', 'Lefèvre', 'Garnier', 'Fournier', 'Roussel', 'Girard', 'Bonnet', 'Mercier', 'Lambert'];

    public function __construct(
        private readonly Database $database,
        private readonly SquadronStore $squadrons,
        private readonly Randomizer $random = new Randomizer(),
    ) {
    }

    public function found(int $playerId): void
    {
        $this->database->transaction(function () use ($playerId): void {
            foreach (self::PILOT_RANKS as $rank) {
                $this->squadrons->addPilot($playerId, $this->newPilot($rank));
            }
            $model = $this->squadrons->modelByCode(self::AIRCRAFT_CODE);
            for ($count = 0; $count < self::AIRCRAFT_COUNT; $count += 1) {
                $this->squadrons->addAircraft($playerId, $model);
            }
        });
    }

    private function newPilot(int $rank): Pilot
    {
        $name = self::FIRST_NAMES[$this->random->getInt(0, count(self::FIRST_NAMES) - 1)] . ' '
            . self::LAST_NAMES[$this->random->getInt(0, count(self::LAST_NAMES) - 1)];

        return new Pilot(
            0,
            $name,
            $rank,
            $this->random->getInt(0, self::MAX_STARTING_GAUGE),
            $this->random->getInt(0, self::MAX_STARTING_GAUGE),
            $this->random->getInt(self::MIN_SKILL, self::MAX_SKILL),
            $this->random->getInt(self::MIN_SKILL, self::MAX_SKILL),
        );
    }
}
