<?php

declare(strict_types=1);

namespace Ww2\Base;

use Ww2\Mission\MissionStore;
use Ww2\Squadron\SquadronStore;

/**
 * The aircraft standing on the ground of a camp, which defend it when it is raided and are lost with it when it falls.
 */
final class Garrison
{
    public function __construct(
        private readonly SquadronStore $squadrons,
        private readonly StationingStore $stationings,
        private readonly MissionStore $missions,
        private readonly HangarStore $hangar,
    ) {
    }

    /**
     * @return array<int, LandedAircraft> the aircraft of other bases standing at the camp after landing, not recalled, by id
     */
    public function guestsAt(int $campId, int $gameSeconds): array
    {
        $guests = [];
        foreach ($this->stationings->landedAt($campId, $gameSeconds) as $stationing) {
            $aircraft = $this->squadrons->aircraftById($stationing->originBaseId)[$stationing->aircraftId];
            $guests[$aircraft->id] = new LandedAircraft($aircraft, $stationing->originBaseId, $this->hangar->isGrounded($aircraft->id));
        }

        return $guests;
    }

    /**
     * @return list<int> the ids of the aircraft of the camp that are neither stationed elsewhere nor out on a mission, then those of other bases landed there
     */
    public function onGround(int $campId, int $gameSeconds): array
    {
        $ids = [];
        foreach ($this->atCamp($campId, $gameSeconds) as $aircraftId) {
            if (!$this->missions->isOnFlight($aircraftId)) {
                $ids[] = $aircraftId;
            }
        }

        return $ids;
    }

    /**
     * @return list<int> the ids of the aircraft that belong to the camp or stand on it: its own that are not stationed elsewhere, flying or not, then those of other bases landed there
     */
    public function atCamp(int $campId, int $gameSeconds): array
    {
        $awayIds = [];
        foreach ($this->stationings->involving($campId) as $stationing) {
            $isHome = $stationing->returnsGameSecond !== null && $stationing->returnsGameSecond <= $gameSeconds;
            if ($stationing->originBaseId === $campId && !$isHome) {
                $awayIds[] = $stationing->aircraftId;
            }
        }
        $ids = [];
        foreach ($this->squadrons->aircraftOf($campId) as $aircraft) {
            if (!in_array($aircraft->id, $awayIds, true)) {
                $ids[] = $aircraft->id;
            }
        }
        foreach ($this->stationings->landedAt($campId, $gameSeconds) as $stationing) {
            $ids[] = $stationing->aircraftId;
        }

        return $ids;
    }
}
