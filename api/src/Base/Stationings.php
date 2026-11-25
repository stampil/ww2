<?php

declare(strict_types=1);

namespace Ww2\Base;

use Ww2\Clock\GameClock;
use Ww2\Clock\GameClockStore;
use Ww2\Database\Database;
use Ww2\Mission\MissionStore;
use Ww2\Squadron\SquadronStore;
use Ww2\World\Bases;
use Ww2\World\Kinship;
use Ww2\World\SitePlaces;

/**
 * Aircraft sent to another base of the world, the player's own, an ally's or a free camp, which the aircraft takes by landing first: they fly out with fuel and ammunition in the hold, unload it and stay there until recalled, which sends them back. Away, they cannot fly a mission of their base, rest or be given; once landed, the camp flies them on its own missions.
 * A supply flight is the same flight to a base of the player or of an ally with a hold of any resource, from which the aircraft turns round at once; each flight lasts as the distance on the map says, fifteen minutes each way at most.
 */
final class Stationings
{
    /** What the hold of an aircraft takes of each resource. */
    public const LOAD_LIMIT = 100;

    public function __construct(
        private readonly Database $database,
        private readonly BaseStore $baseStore,
        private readonly BaseFounder $baseFounder,
        private readonly StationingStore $stationings,
        private readonly SquadronStore $squadrons,
        private readonly MissionStore $missions,
        private readonly HangarStore $hangarStore,
        private readonly Warehouse $warehouse,
        private readonly Bases $bases,
        private readonly GameClockStore $clocks,
        private readonly EventLog $events,
        private readonly SitePlaces $places,
    ) {
    }

    /**
     * @return int the game seconds a flight takes from one base to the other, out or back
     */
    public function flightSecondsBetween(int $firstBaseId, int $secondBaseId): int
    {
        return $this->places->flightSeconds($this->bases->siteOf($firstBaseId), $this->bases->siteOf($secondBaseId));
    }

    /**
     * Unloads what has landed first. The aircraft of the base that are away are listed with where they went, and those of other bases that are stationed at the base with whose they are.
     *
     * @param GameClock $clock the clock of the base, read once for the whole answer
     * @return array{away: list<array<string, int|string>>, guests: list<array<string, int|string>>}
     */
    public function describe(int $baseId, GameClock $clock): array
    {
        $this->settle($baseId, $clock->gameSeconds);
        $away = [];
        $guests = [];
        foreach ($this->stationings->involving($baseId) as $stationing) {
            $phase = $stationing->phaseAt($clock->gameSeconds)->value;
            $remainingSeconds = $stationing->remainingSecondsAt($clock->gameSeconds);
            $flightSeconds = $this->flightSecondsBetween($stationing->originBaseId, $stationing->destinationBaseId);
            if ($stationing->originBaseId === $baseId) {
                $away[] = [
                    'aircraftId' => $stationing->aircraftId,
                    'pilotId' => $stationing->pilotId,
                    'site' => $this->bases->siteOf($stationing->destinationBaseId)->value,
                    'phase' => $phase,
                    'remainingSeconds' => $remainingSeconds,
                    'flightSeconds' => $flightSeconds,
                ];
                continue;
            }
            $aircraft = $this->squadrons->aircraftById($stationing->originBaseId)[$stationing->aircraftId];
            $guests[] = [
                'aircraftId' => $stationing->aircraftId,
                'aircraftName' => $aircraft->model->name,
                'aircraftNumber' => $aircraft->number,
                'pilotName' => $this->squadrons->pilotsById($stationing->originBaseId)[$stationing->pilotId]->name,
                'site' => $this->bases->siteOf($stationing->originBaseId)->value,
                'holder' => $this->bases->holderNameOf($stationing->originBaseId),
                'kinship' => $this->bases->kinshipTo($baseId, $stationing->originBaseId)->value,
                'phase' => $phase,
                'remainingSeconds' => $remainingSeconds,
                'flightSeconds' => $flightSeconds,
            ];
        }

        return ['away' => $away, 'guests' => $guests];
    }

    /**
     * Sends an aircraft and its pilot to another base of the player, of an ally, or to a free camp, with a load of fuel and ammunition for it.
     *
     * @throws BaseException when the destination is not one of those, the player holds as many bases as they can and the camp is free, the pilot or the aircraft is not the base's,
     *                       rests, flies, is away or grounded, the load is more than the aircraft can carry, the base runs short of it or the destination's warehouse cannot hold it
     */
    public function send(int $baseId, int $destinationBaseId, int $pilotId, int $aircraftId, int $fuel, int $ammunition): void
    {
        $this->database->transaction(function () use ($baseId, $destinationBaseId, $pilotId, $aircraftId, $fuel, $ammunition): void {
            $destination = null;
            foreach ($this->bases->destinationsOf($baseId) as $candidate) {
                if ($candidate['id'] === $destinationBaseId) {
                    $destination = $candidate;
                }
            }
            if ($destination === null) {
                throw new BaseException(BaseError::InvalidRecipient);
            }
            if ($destination['kinship'] === Kinship::Free) {
                if (count($this->bases->idsOf($this->bases->holderIdOf($baseId))) >= Bases::MAX_PER_PLAYER) {
                    throw new BaseException(BaseError::TooManyBases);
                }
                $this->baseFounder->foundEmpty($destinationBaseId);
            }
            $this->fly($baseId, $destinationBaseId, $pilotId, $aircraftId, new Cargo($fuel, $ammunition, 0, 0), false);
        });
    }

    /**
     * Sends an aircraft and its pilot to a base of the player or of an ally with a hold of resources, and back as soon as they have landed.
     *
     * @throws BaseException when the destination is not a base of the player or of an ally, the hold is empty, the pilot or the aircraft is not the base's, rests, flies, is away or grounded,
     *                       the load is more than the aircraft can carry, the base runs short of it or the destination's warehouse cannot hold it
     */
    public function supply(int $baseId, int $destinationBaseId, int $pilotId, int $aircraftId, Cargo $cargo): void
    {
        $this->database->transaction(function () use ($baseId, $destinationBaseId, $pilotId, $aircraftId, $cargo): void {
            if ($this->bases->kinshipTo($baseId, $destinationBaseId) === null) {
                throw new BaseException(BaseError::InvalidRecipient);
            }
            if ($cargo->isEmpty()) {
                throw new BaseException(BaseError::InvalidQuantity);
            }
            $this->fly($baseId, $destinationBaseId, $pilotId, $aircraftId, $cargo, true);
        });
    }

    /**
     * Recalls a stationed aircraft: it flies back to its base, where it and its pilot are free again. A base of the same player can give the order as well as the aircraft's own.
     *
     * @throws BaseException when the aircraft is not standing at a camp after being sent from a base of the player: it is not sent, still flying out, or already flying back,
     *                       or when it is out on a mission of that camp
     */
    public function recall(int $baseId, int $aircraftId): void
    {
        $this->database->transaction(function () use ($baseId, $aircraftId): void {
            $located = $this->stationings->of($aircraftId);
            if ($located === null) {
                throw new BaseException(BaseError::NotStationed);
            }
            // The camp is locked too, so that a mission launched from it and this recall cannot cross.
            $this->baseStore->lockBoth($baseId, $located->destinationBaseId);
            $gameSeconds = $this->clocks->of($baseId)->gameSeconds;
            $stationing = $this->stationings->of($aircraftId);
            if ($stationing === null || ($stationing->originBaseId !== $baseId && $this->bases->kinshipTo($baseId, $stationing->originBaseId) !== Kinship::Own)) {
                throw new BaseException(BaseError::NotStationed);
            }
            if ($stationing->phaseAt($gameSeconds) !== StationingPhase::Stationed) {
                throw new BaseException(BaseError::NotStationed);
            }
            if ($this->missions->isOnFlight($aircraftId)) {
                throw new BaseException(BaseError::CrewBusy);
            }
            $this->stationings->startReturn($aircraftId, $gameSeconds + $this->flightSecondsBetween($stationing->originBaseId, $stationing->destinationBaseId));
        });
    }

    /**
     * Takes the crew and the cargo out of the base and sets the flight going, inside the transaction of the order.
     *
     * @param bool $comesBack whether the aircraft turns round as soon as it has landed
     * @throws BaseException when the pilot or the aircraft is not the base's, rests, flies, is away or grounded, the load is more than the aircraft can carry, the base runs short of it or the destination's warehouse cannot hold it
     */
    private function fly(int $baseId, int $destinationBaseId, int $pilotId, int $aircraftId, Cargo $cargo, bool $comesBack): void
    {
        $locked = $this->baseStore->lockBoth($baseId, $destinationBaseId);
        $gameSeconds = $this->clocks->of($baseId)->gameSeconds;
        $this->stationings->clearReturned($baseId, $gameSeconds);
        $pilot = $this->squadrons->pilotsById($baseId)[$pilotId] ?? throw new BaseException(BaseError::UnknownPilot);
        $aircraft = $this->squadrons->aircraftById($baseId)[$aircraftId] ?? throw new BaseException(BaseError::UnknownAircraft);
        if (isset($this->squadrons->restsOf($baseId)[$pilot->id])) {
            throw new BaseException(BaseError::PilotResting);
        }
        if ($this->missions->isPilotOnFlight($pilot->id) || $this->missions->isOnFlight($aircraft->id)
            || $this->stationings->isPilotAway($pilot->id, $gameSeconds) || $this->stationings->isAircraftAway($aircraft->id, $gameSeconds)) {
            throw new BaseException(BaseError::CrewBusy);
        }
        if (in_array($aircraft->id, $this->hangarStore->groundedAircraftIds($baseId), true)) {
            throw new BaseException(BaseError::AircraftGrounded);
        }
        $capacity = $this->warehouse->capacityOf($destinationBaseId);
        foreach (Resource::cases() as $resource) {
            $quantity = $cargo->of($resource);
            if ($quantity < 0 || $quantity > self::LOAD_LIMIT) {
                throw new BaseException(BaseError::InvalidLoad);
            }
            if ($resource->in($locked[$baseId]) < $quantity) {
                throw new BaseException($resource->shortage());
            }
            $stock = $resource->stock();
            if ($stock !== null && $locked[$destinationBaseId]->stock($stock) + $quantity > $capacity) {
                throw new BaseException(BaseError::RecipientWarehouseFull);
            }
        }
        $flightSeconds = $this->flightSecondsBetween($baseId, $destinationBaseId);
        $landsGameSecond = $gameSeconds + $flightSeconds;
        $this->baseStore->spendCargo($baseId, $cargo);
        $this->stationings->add(new Stationing($aircraft->id, $pilot->id, $baseId, $destinationBaseId, $cargo, $landsGameSecond, $comesBack ? $landsGameSecond + $flightSeconds : null));
    }

    private function settle(int $baseId, int $gameSeconds): void
    {
        $this->stationings->clearReturned($baseId, $gameSeconds);
        $landed = [];
        foreach ($this->stationings->involving($baseId) as $stationing) {
            if ($stationing->landsGameSecond <= $gameSeconds && !$stationing->cargo->isEmpty()) {
                $landed[] = $stationing->aircraftId;
            }
        }
        if ($landed === []) {
            return;
        }
        $this->database->transaction(function () use ($landed): void {
            foreach ($landed as $aircraftId) {
                $this->unload($aircraftId);
            }
        });
    }

    /**
     * Puts what an aircraft carries into the warehouse of the base where it landed, as much as fits, and tells the base. The supplies need no warehouse and all arrive.
     */
    private function unload(int $aircraftId): void
    {
        $stationing = $this->stationings->of($aircraftId);
        if ($stationing === null) {
            return;
        }
        $locked = $this->baseStore->lockBoth($stationing->originBaseId, $stationing->destinationBaseId);
        // Read again under the lock: another request may have unloaded it meanwhile.
        $stationing = $this->stationings->of($aircraftId);
        if ($stationing === null || $stationing->cargo->isEmpty()) {
            return;
        }
        $destination = $locked[$stationing->destinationBaseId];
        $capacity = $this->warehouse->capacityOf($stationing->destinationBaseId);
        $cargo = $stationing->cargo;
        $unloaded = new Cargo(
            min($cargo->fuel, max(0, $capacity - $destination->fuel)),
            min($cargo->ammunition, max(0, $capacity - $destination->ammunition)),
            min($cargo->materials, max(0, $capacity - $destination->materials)),
            $cargo->supplies,
        );
        $this->baseStore->addCargo($stationing->destinationBaseId, $unloaded);
        $this->stationings->emptyHold($aircraftId);
        if (!$unloaded->isEmpty()) {
            $this->events->record($stationing->destinationBaseId, [
                'kind' => 'landing',
                'from' => $this->bases->holderNameOf($stationing->originBaseId),
                'site' => $this->bases->siteOf($stationing->originBaseId)->value,
                'aircraftName' => $this->squadrons->aircraftById($stationing->originBaseId)[$aircraftId]->model->name,
                'fuel' => $unloaded->fuel,
                'ammunition' => $unloaded->ammunition,
                'materials' => $unloaded->materials,
                'supplies' => $unloaded->supplies,
            ]);
        }
    }
}
