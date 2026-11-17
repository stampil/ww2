<?php

declare(strict_types=1);

namespace Ww2\Squadron;

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

    public function __construct(
        private readonly Database $database,
        private readonly SquadronStore $squadrons,
        private readonly PilotGenerator $pilots,
    ) {
    }

    public function found(int $playerId): void
    {
        $this->database->transaction(function () use ($playerId): void {
            foreach (self::PILOT_RANKS as $rank) {
                $this->squadrons->addPilot($playerId, $this->pilots->generate($rank));
            }
            $model = $this->squadrons->modelByCode(self::AIRCRAFT_CODE);
            for ($count = 0; $count < self::AIRCRAFT_COUNT; $count += 1) {
                $this->squadrons->addAircraft($playerId, $model);
            }
        });
    }
}
