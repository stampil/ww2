<?php

declare(strict_types=1);

namespace Ww2\Squadron;

use Ww2\World\Clan;

/**
 * Gives a new base a squadron to start with: a few pilots of different ranks and three aircraft of the side of the base, each of a type in a livery. The caller holds the transaction.
 */
final class SquadronFounder
{
    private const D520_CODE = 'd520';
    private const BF109_CODE = 'bf109';
    /** @var list<array{string, Livery}> the type and the livery of each starting aircraft of an Allied base: three French D.520 */
    private const ALLIED_AIRCRAFT = [[self::D520_CODE, Livery::French], [self::D520_CODE, Livery::French], [self::D520_CODE, Livery::French]];
    /** @var list<array{string, Livery}> the same for a base of the Axe: a Bf 109, a German D.520 and a Vichy one */
    private const AXE_AIRCRAFT = [[self::BF109_CODE, Livery::Luftwaffe], [self::D520_CODE, Livery::German], [self::D520_CODE, Livery::Vichy]];
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
        $aircraft = $this->squadrons->clanOf($baseId) === Clan::Axe ? self::AXE_AIRCRAFT : self::ALLIED_AIRCRAFT;
        foreach ($aircraft as [$code, $livery]) {
            $this->squadrons->addAircraft($baseId, $this->squadrons->modelByCode($code), $livery);
        }
    }

    /**
     * Adds one more D.520, in the livery that the base paints its D.520 in.
     */
    public function addStartingAircraft(int $baseId): void
    {
        $livery = $this->squadrons->clanOf($baseId) === Clan::Axe ? Livery::German : Livery::French;
        $this->squadrons->addAircraft($baseId, $this->squadrons->modelByCode(self::D520_CODE), $livery);
    }
}
