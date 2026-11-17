<?php

declare(strict_types=1);

namespace Ww2\Base;

use Ww2\Clock\GameClockStore;
use Ww2\Squadron\Aircraft;
use Ww2\Squadron\Pilot;
use Ww2\Squadron\SquadronStore;

/**
 * Puts together everything the front shows of a base, from the same reading of the game clock.
 */
final class BaseOverview
{
    public function __construct(
        private readonly BaseStore $bases,
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
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function of(int $playerId): array
    {
        $clock = $this->clocks->of($playerId);
        $hangar = $this->hangar->describe($playerId, $clock);
        $roster = $this->roster->describe($playerId, $clock);
        $headquarters = $this->headquarters->describe($playerId, $clock);

        return [
            'terrainPlan' => $this->bases->terrainPlanOf($playerId),
            'resources' => $this->bases->resourcesOf($playerId)->toArray(),
            'buildings' => array_map(static fn (Building $building): string => $building->value, Building::cases()),
            'warehouse' => $this->warehouse->describe($playerId),
            'clock' => $clock->toArray(),
            'workshop' => $this->workshop->describe($playerId, $clock),
            'headquarters' => $headquarters,
            'hangar' => $hangar,
            'roster' => $roster,
            'squadron' => [
                'pilots' => array_map(static fn (Pilot $pilot): array => $pilot->toArray(), $this->squadrons->pilotsOf($playerId)),
                'aircraft' => array_map(static fn (Aircraft $aircraft): array => $aircraft->toArray(), $this->squadrons->aircraftOf($playerId)),
            ],
            'events' => $this->events->latest($playerId),
            'upgrades' => $this->upgrades->describe($playerId),
            'battle' => $this->battle->describe($playerId),
        ];
    }
}
