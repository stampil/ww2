<?php

declare(strict_types=1);

namespace Ww2\Base;

use Ww2\Clock\GameClockStore;
use Ww2\Squadron\Aircraft;
use Ww2\Squadron\SquadronStore;
use Ww2\World\Bases;

/**
 * Puts together everything the front shows of a base, from the same reading of the game clock.
 */
final class BaseOverview
{
    public function __construct(
        private readonly BaseStore $baseStore,
        private readonly Warehouse $warehouse,
        private readonly Workshop $workshop,
        private readonly Headquarters $headquarters,
        private readonly Hangar $hangar,
        private readonly Roster $roster,
        private readonly Upgrades $upgrades,
        private readonly Battle $battle,
        private readonly SquadronStore $squadrons,
        private readonly EventLog $events,
        private readonly GameClockStore $clocks,
        private readonly Bases $sites,
        private readonly Stationings $stationings,
        private readonly CampStore $camps,
        private readonly Attacks $attacks,
        private readonly SupplyIncome $income,
        private readonly Garrison $garrison,
        private readonly LifeEvents $lifeEvents,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function of(int $baseId): array
    {
        $clock = $this->clocks->of($baseId);
        $this->income->settle($baseId, $clock->gameSeconds);
        $this->lifeEvents->settle($baseId);
        $hangar = $this->hangar->describe($baseId, $clock);
        $roster = $this->roster->describe($baseId, $clock);
        $headquarters = $this->headquarters->describe($baseId, $clock);
        $stationings = $this->stationings->describe($baseId, $clock);
        $assignments = $this->squadrons->assignmentsOf($baseId);
        $pilots = [];
        foreach ($this->squadrons->pilotsOf($baseId) as $pilot) {
            $assigned = [];
            foreach ($assignments[$pilot->id] ?? [] as $assignment) {
                $assigned[] = ['site' => $this->sites->siteOf($assignment['baseId'])->value, 'since' => $clock->dateOf($assignment['epoch'])];
            }
            $pilots[] = $pilot->toArray() + ['assignments' => $assigned];
        }
        $borrowed = [];
        foreach ($this->garrison->guestsAt($baseId, $clock->gameSeconds) as $guest) {
            $borrowed[] = $guest->aircraft->toArray(time()) + [
                'holder' => $this->sites->holderNameOf($guest->originBaseId),
                'site' => $this->sites->siteOf($guest->originBaseId)->value,
                'grounded' => $guest->isGrounded,
            ];
        }

        return [
            'baseId' => $baseId,
            'bases' => $this->sites->heldWith($baseId),
            'baseLimit' => Bases::MAX_PER_PLAYER,
            'recipients' => array_map(static fn (array $recipient): array => [...$recipient, 'kinship' => $recipient['kinship']->value], $this->sites->recipientsOf($baseId)),
            'destinations' => array_map(fn (array $destination): array => [...$destination, 'kinship' => $destination['kinship']->value, 'flightSeconds' => $this->stationings->flightSecondsBetween($baseId, $destination['id'])], $this->sites->destinationsOf($baseId)),
            'site' => $this->sites->siteOf($baseId)->value,
            'clan' => $this->sites->clanOfBase($baseId)->value,
            'terrainPlan' => $this->baseStore->terrainPlanOf($baseId),
            'resources' => $this->baseStore->resourcesOf($baseId)->toArray(),
            'supplyIncome' => $this->income->perMinuteAt($baseId),
            'buildings' => array_map(static fn (Building $building): string => $building->value, Building::cases()),
            'camp' => [
                'defense' => $this->camps->defenseOf($baseId, $clock->gameSeconds),
                'destroyed' => array_map(static fn (Building $building): string => $building->value, $this->camps->destroyedOf($baseId)),
                'rebuildCost' => Rebuilding::MATERIAL_COST,
            ],
            'targets' => $this->attacks->targetsOf($baseId, $clock->gameSeconds),
            'warehouse' => $this->warehouse->describe($baseId),
            'clock' => $clock->toArray(),
            'workshop' => $this->workshop->describe($baseId, $clock),
            'headquarters' => $headquarters,
            'hangar' => $hangar,
            'roster' => $roster,
            'stationings' => $stationings,
            'squadron' => [
                'pilots' => $pilots,
                'aircraft' => array_map(static fn (Aircraft $aircraft): array => $aircraft->toArray(time()), $this->squadrons->aircraftOf($baseId)),
                'borrowed' => $borrowed,
            ],
            'events' => $this->events->latest($baseId),
            'upgrades' => $this->upgrades->describe($baseId),
            'battle' => $this->battle->describe($baseId),
        ];
    }
}
