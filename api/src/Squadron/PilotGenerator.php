<?php

declare(strict_types=1);

namespace Ww2\Squadron;

use Random\Randomizer;

/**
 * Makes a new pilot of a given rank: a French name, and skills and gauges drawn at random.
 */
final class PilotGenerator
{
    private const MIN_SKILL = 40;
    private const MAX_SKILL = 70;
    private const MAX_STARTING_GAUGE = 10;
    private const FIRST_NAMES = ['Jean', 'Pierre', 'Marcel', 'Henri', 'Lucien', 'Paul', 'André', 'Louis', 'Roger', 'Émile'];
    private const LAST_NAMES = ['Dupont', 'Moreau', 'Lefèvre', 'Garnier', 'Fournier', 'Roussel', 'Girard', 'Bonnet', 'Mercier', 'Lambert'];

    public function __construct(private readonly Randomizer $random = new Randomizer())
    {
    }

    public function generate(int $rank): Pilot
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
