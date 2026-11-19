<?php

declare(strict_types=1);

namespace Ww2\Base;

use Ww2\Clock\GameClockStore;
use Ww2\Database\Database;
use Ww2\Mission\MissionStore;
use Ww2\Squadron\Pilot;
use Ww2\Squadron\SquadronStore;
use Ww2\World\Bases;
use Ww2\World\Kinship;

/**
 * What a base gives to another, at once and for nothing: supplies and stocks to its own bases and to its allies', pilots and aircraft to its own bases only.
 * What flies, is stationed away, rests or is being repaired is not given. The recipient hears of it in its journal.
 */
final class Gifts
{
    public function __construct(
        private readonly Database $database,
        private readonly BaseStore $baseStore,
        private readonly SquadronStore $squadrons,
        private readonly MissionStore $missions,
        private readonly HangarStore $hangarStore,
        private readonly Warehouse $warehouse,
        private readonly Bases $bases,
        private readonly EventLog $events,
        private readonly StationingStore $stationings,
        private readonly GameClockStore $clocks,
    ) {
    }

    /**
     * @throws BaseException when the quantity is not positive, the recipient is not an own or allied base, the giver runs short or the recipient's warehouse would overflow
     */
    public function giveResource(int $fromBaseId, int $toBaseId, Resource $resource, int $quantity): void
    {
        if ($quantity < 1) {
            throw new BaseException(BaseError::InvalidQuantity);
        }
        $this->database->transaction(function () use ($fromBaseId, $toBaseId, $resource, $quantity): void {
            $this->kinshipOrFail($fromBaseId, $toBaseId);
            $locked = $this->baseStore->lockBoth($fromBaseId, $toBaseId);
            if ($resource->in($locked[$fromBaseId]) < $quantity) {
                throw new BaseException($resource->shortage());
            }
            $stock = $resource->stock();
            if ($stock !== null && $locked[$toBaseId]->stock($stock) + $quantity > $this->warehouse->capacityOf($toBaseId)) {
                throw new BaseException(BaseError::RecipientWarehouseFull);
            }
            $this->baseStore->transfer($fromBaseId, $toBaseId, $resource, $quantity);
            $this->announce($fromBaseId, $toBaseId, ['item' => $resource->value, 'quantity' => $quantity, 'name' => null]);
        });
    }

    /**
     * @throws BaseException when the recipient is not another base of the player, the pilot is not the giver's, flies or rests, or the recipient has as many pilots as it can house
     */
    public function givePilot(int $fromBaseId, int $toBaseId, int $pilotId): void
    {
        $this->database->transaction(function () use ($fromBaseId, $toBaseId, $pilotId): void {
            $this->ownBaseOrFail($fromBaseId, $toBaseId);
            $this->baseStore->lockBoth($fromBaseId, $toBaseId);
            $pilot = $this->pilotOf($fromBaseId, $pilotId);
            if (isset($this->squadrons->restsOf($fromBaseId)[$pilotId])) {
                throw new BaseException(BaseError::PilotResting);
            }
            if ($this->missions->isPilotOnFlight($pilotId) || $this->stationings->isPilotAway($pilotId, $this->clocks->of($fromBaseId)->gameSeconds)) {
                throw new BaseException(BaseError::CrewBusy);
            }
            if (count($this->squadrons->pilotsOf($toBaseId)) >= Roster::MAX_PILOTS) {
                throw new BaseException(BaseError::TooManyPilots);
            }
            $this->squadrons->movePilot($pilotId, $toBaseId);
            $this->announce($fromBaseId, $toBaseId, ['item' => 'pilot', 'quantity' => null, 'name' => $pilot->name]);
        });
    }

    /**
     * @throws BaseException when the recipient is not another base of the player, the aircraft is not the giver's, flies, is grounded, or the recipient has no room for it
     */
    public function giveAircraft(int $fromBaseId, int $toBaseId, int $aircraftId): void
    {
        $this->database->transaction(function () use ($fromBaseId, $toBaseId, $aircraftId): void {
            $this->ownBaseOrFail($fromBaseId, $toBaseId);
            $this->baseStore->lockBoth($fromBaseId, $toBaseId);
            $aircraft = null;
            foreach ($this->squadrons->aircraftOf($fromBaseId) as $candidate) {
                if ($candidate->id === $aircraftId) {
                    $aircraft = $candidate;
                }
            }
            if ($aircraft === null) {
                throw new BaseException(BaseError::UnknownAircraft);
            }
            if ($this->missions->isOnFlight($aircraftId) || $this->stationings->isAircraftAway($aircraftId, $this->clocks->of($fromBaseId)->gameSeconds)) {
                throw new BaseException(BaseError::CrewBusy);
            }
            if (in_array($aircraftId, $this->hangarStore->groundedAircraftIds($fromBaseId), true)) {
                throw new BaseException(BaseError::AircraftGrounded);
            }
            if (count($this->squadrons->aircraftOf($toBaseId)) >= Hangar::PLACES) {
                throw new BaseException(BaseError::HangarFull);
            }
            $this->squadrons->moveAircraft($aircraftId, $toBaseId);
            $this->announce($fromBaseId, $toBaseId, ['item' => 'aircraft', 'quantity' => null, 'name' => $aircraft->model->name]);
        });
    }

    /**
     * @throws BaseException when the recipient is not another base of the player's world held by the player or by an ally
     */
    private function kinshipOrFail(int $fromBaseId, int $toBaseId): Kinship
    {
        return $this->bases->kinshipTo($fromBaseId, $toBaseId) ?? throw new BaseException(BaseError::InvalidRecipient);
    }

    /**
     * @throws BaseException when the recipient is not another base of the player
     */
    private function ownBaseOrFail(int $fromBaseId, int $toBaseId): void
    {
        if ($this->kinshipOrFail($fromBaseId, $toBaseId) !== Kinship::Own) {
            throw new BaseException(BaseError::OwnBasesOnly);
        }
    }

    /**
     * @throws BaseException when the pilot is not one of the base's
     */
    private function pilotOf(int $baseId, int $pilotId): Pilot
    {
        foreach ($this->squadrons->pilotsOf($baseId) as $pilot) {
            if ($pilot->id === $pilotId) {
                return $pilot;
            }
        }

        throw new BaseException(BaseError::UnknownPilot);
    }

    /**
     * @param array{item: string, quantity: int|null, name: string|null} $gift
     */
    private function announce(int $fromBaseId, int $toBaseId, array $gift): void
    {
        $this->events->record($toBaseId, ['kind' => 'gift', 'from' => $this->bases->holderNameOf($fromBaseId), 'site' => $this->bases->siteOf($fromBaseId)->value, ...$gift]);
    }
}
