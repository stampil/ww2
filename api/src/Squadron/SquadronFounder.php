<?php

declare(strict_types=1);

namespace Ww2\Squadron;

use Ww2\World\Clan;

/**
 * Gives a new base a squadron to start with: a few pilots of different ranks and a few D.520, painted for the side of the base. The caller holds the transaction.
 */
final class SquadronFounder
{
    private const AIRCRAFT_CODE = 'd520';
    private const AIRCRAFT_COUNT = 3;
    /** @var list<int> the rank of each starting pilot: a sub-lieutenant, two staff sergeants, a sergeant */
    private const PILOT_RANKS = [4, 2, 2, 1];

    public function __construct(private readonly SquadronStore $squadrons, private readonly PilotGenerator $pilots)
    {
    }

    public function found(int $baseId): void
    {
        foreach (self::PILOT_RANKS as $rank) {
            $this->squadrons->addPilot($baseId, $this->pilots->generate($rank));
        }
        for ($count = 0; $count < self::AIRCRAFT_COUNT; $count += 1) {
            $this->addStartingAircraft($baseId);
        }
    }

    /**
     * Adds one D.520, in the livery that the base paints its aircraft in.
     */
    public function addStartingAircraft(int $baseId): void
    {
        $livery = $this->squadrons->clanOf($baseId) === Clan::Axe ? Livery::German : Livery::French;
        $this->squadrons->addAircraft($baseId, $this->squadrons->modelByCode(self::AIRCRAFT_CODE), $livery);
    }
}
