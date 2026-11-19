<?php

declare(strict_types=1);

namespace Ww2\Base;

use Ww2\Clock\GameClockStore;
use Ww2\Squadron\Aircraft;
use Ww2\Squadron\Pilot;
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
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function of(int $baseId): array
    {
        $clock = $this->clocks->of($baseId);
        $hangar = $this->hangar->describe($baseId, $clock);
        $roster = $this->roster->describe($baseId, $clock);
        $headquarters = $this->headquarters->describe($baseId, $clock);
        $stationings = $this->stationings->describe($baseId, $clock);

        return [
            'baseId' => $baseId,
            'bases' => $this->sites->heldWith($baseId),
            'baseLimit' => Bases::MAX_PER_PLAYER,
            'recipients' => array_map(static fn (array $recipient): array => [...$recipient, 'kinship' => $recipient['kinship']->value], $this->sites->recipientsOf($baseId)),
            'destinations' => array_map(static fn (array $destination): array => [...$destination, 'kinship' => $destination['kinship']->value], $this->sites->destinationsOf($baseId)),
            'site' => $this->sites->siteOf($baseId)->value,
            'terrainPlan' => $this->baseStore->terrainPlanOf($baseId),
            'resources' => $this->baseStore->resourcesOf($baseId)->toArray(),
            'buildings' => array_map(static fn (Building $building): string => $building->value, Building::cases()),
            'warehouse' => $this->warehouse->describe($baseId),
            'clock' => $clock->toArray(),
            'workshop' => $this->workshop->describe($baseId, $clock),
            'headquarters' => $headquarters,
            'hangar' => $hangar,
            'roster' => $roster,
            'stationings' => $stationings,
            'squadron' => [
                'pilots' => array_map(static fn (Pilot $pilot): array => $pilot->toArray(), $this->squadrons->pilotsOf($baseId)),
                'aircraft' => array_map(static fn (Aircraft $aircraft): array => $aircraft->toArray(), $this->squadrons->aircraftOf($baseId)),
            ],
            'events' => $this->events->latest($baseId),
            'upgrades' => $this->upgrades->describe($baseId),
            'battle' => $this->battle->describe($baseId),
        ];
    }
}
