<?php

declare(strict_types=1);

namespace Ww2\Squadron;

use Random\Randomizer;
use Ww2\World\Clan;

/**
 * Makes a new pilot of a given rank and side: a French or a German name, and skills and gauges drawn at random.
 */
final class PilotGenerator
{
    private const MIN_SKILL = 40;
    private const MAX_SKILL = 70;
    private const MAX_STARTING_GAUGE = 10;
    /** The first names and the last names of each side, by the name of the side. */
    private const NAMES = [
        Clan::French->value => [
            'first' => ['Jean', 'Pierre', 'Marcel', 'Henri', 'Lucien', 'Paul', 'André', 'Louis', 'Roger', 'Émile'],
            'last' => ['Dupont', 'Moreau', 'Lefèvre', 'Garnier', 'Fournier', 'Roussel', 'Girard', 'Bonnet', 'Mercier', 'Lambert'],
        ],
        Clan::Axe->value => [
            'first' => ['Hans', 'Karl', 'Friedrich', 'Wilhelm', 'Heinrich', 'Walter', 'Hermann', 'Werner', 'Gerhard', 'Ernst'],
            'last' => ['Müller', 'Schneider', 'Fischer', 'Weber', 'Wagner', 'Becker', 'Hoffmann', 'Schäfer', 'Koch', 'Richter'],
        ],
    ];

    public function __construct(private readonly Randomizer $random = new Randomizer())
    {
    }

    public function generate(int $rank, Clan $clan): Pilot
    {
        $names = self::NAMES[$clan->value];
        $name = $names['first'][$this->random->getInt(0, count($names['first']) - 1)] . ' '
            . $names['last'][$this->random->getInt(0, count($names['last']) - 1)];

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
