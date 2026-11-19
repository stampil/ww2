<?php

declare(strict_types=1);

namespace Ww2\Base;

use Ww2\Clock\GameClock;
use Ww2\Clock\GameClockStore;
use Ww2\Database\Database;
use Ww2\Mission\MissionStore;
use Ww2\Squadron\SquadronStore;
use Ww2\World\Bases;

/**
 * Aircraft stationed at another base of the world, the player's own or an ally's: an aircraft and its pilot fly out with fuel and ammunition in the hold, unload it when they land,
 * and stay there until the player recalls them, which sends them back. Away, they belong to their own base but cannot fly a mission, rest or be given.
 */
final class Stationings
{
    /** How long the flight takes, out or back. */
    public const FLIGHT_SECONDS = 60;

    public function __construct(
        private readonly Database $database,
        private readonly BaseStore $baseStore,
        private readonly StationingStore $stationings,
        private readonly SquadronStore $squadrons,
        private readonly MissionStore $missions,
        private readonly HangarStore $hangarStore,
        private readonly Warehouse $warehouse,
        private readonly Bases $bases,
        private readonly GameClockStore $clocks,
        private readonly EventLog $events,
    ) {
    }

    /**
     * Unloads what has landed first. The aircraft of the base that are away are listed with where they went, and those of other bases that are stationed at the base with whose they are.
     *
     * @param GameClock $clock the clock of the base, read once for the whole answer
     * @return array{flightSeconds: int, away: list<array<string, int|string>>, guests: list<array<string, int|string>>}
     */
    public function describe(int $baseId, GameClock $clock): array
    {
        $this->settle($baseId, $clock->gameSeconds);
        $away = [];
        $guests = [];
        foreach ($this->stationings->involving($baseId) as $stationing) {
            $phase = $stationing->phaseAt($clock->gameSeconds)->value;
            $remainingSeconds = $stationing->remainingSecondsAt($clock->gameSeconds);
            if ($stationing->originBaseId === $baseId) {
                $away[] = [
                    'aircraftId' => $stationing->aircraftId,
                    'pilotId' => $stationing->pilotId,
                    'site' => $this->bases->siteOf($stationing->destinationBaseId)->value,
                    'phase' => $phase,
                    'remainingSeconds' => $remainingSeconds,
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
            ];
        }

        return ['flightSeconds' => self::FLIGHT_SECONDS, 'away' => $away, 'guests' => $guests];
    }

    /**
     * Sends an aircraft and its pilot to another base of the player or of an ally, with a load of fuel and ammunition for it.
     *
     * @throws BaseException when the destination is not one of the player's bases or an ally's, the pilot or the aircraft is not the base's, rests, flies, is away or grounded,
     *                       the load is more than the aircraft can carry, the base runs short of it or the destination's warehouse cannot hold it
     */
    public function send(int $baseId, int $destinationBaseId, int $pilotId, int $aircraftId, int $fuel, int $ammunition): void
    {
        $this->database->transaction(function () use ($baseId, $destinationBaseId, $pilotId, $aircraftId, $fuel, $ammunition): void {
            if ($this->bases->kinshipTo($baseId, $destinationBaseId) === null) {
                throw new BaseException(BaseError::InvalidRecipient);
            }
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
            if ($fuel < 0 || $ammunition < 0 || $fuel > $aircraft->model->fuelCapacity || $ammunition > $aircraft->model->ammunitionCapacity) {
                throw new BaseException(BaseError::InvalidLoad);
            }
            if ($locked[$baseId]->fuel < $fuel) {
                throw new BaseException(BaseError::InsufficientFuel);
            }
            if ($locked[$baseId]->ammunition < $ammunition) {
                throw new BaseException(BaseError::InsufficientAmmunition);
            }
            $capacity = $this->warehouse->capacityOf($destinationBaseId);
            if ($locked[$destinationBaseId]->fuel + $fuel > $capacity || $locked[$destinationBaseId]->ammunition + $ammunition > $capacity) {
                throw new BaseException(BaseError::RecipientWarehouseFull);
            }
            $this->baseStore->spendFuelAndAmmunition($baseId, $fuel, $ammunition);
            $this->stationings->add(new Stationing($aircraft->id, $pilot->id, $baseId, $destinationBaseId, $fuel, $ammunition, $gameSeconds + self::FLIGHT_SECONDS, null));
        });
    }

    /**
     * Recalls a stationed aircraft: it flies back to its base, where it and its pilot are free again.
     *
     * @throws BaseException when the aircraft is not standing at a camp after being sent from the base: it is not sent, still flying out, or already flying back
     */
    public function recall(int $baseId, int $aircraftId): void
    {
        $this->database->transaction(function () use ($baseId, $aircraftId): void {
            $this->baseStore->lockResources($baseId);
            $gameSeconds = $this->clocks->of($baseId)->gameSeconds;
            $stationing = $this->stationings->of($aircraftId);
            if ($stationing === null || $stationing->originBaseId !== $baseId) {
                throw new BaseException(BaseError::NotStationed);
            }
            if ($stationing->phaseAt($gameSeconds) !== StationingPhase::Stationed) {
                throw new BaseException(BaseError::NotStationed);
            }
            $this->stationings->startReturn($aircraftId, $gameSeconds + self::FLIGHT_SECONDS);
        });
    }

    private function settle(int $baseId, int $gameSeconds): void
    {
        $this->stationings->clearReturned($baseId, $gameSeconds);
        $landed = [];
        foreach ($this->stationings->involving($baseId) as $stationing) {
            if ($stationing->landsGameSecond <= $gameSeconds && ($stationing->fuel > 0 || $stationing->ammunition > 0)) {
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
     * Puts what an aircraft carries into the warehouse of the base where it landed, as much as fits, and tells the base.
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
        if ($stationing === null || ($stationing->fuel === 0 && $stationing->ammunition === 0)) {
            return;
        }
        $destination = $locked[$stationing->destinationBaseId];
        $capacity = $this->warehouse->capacityOf($stationing->destinationBaseId);
        $fuel = min($stationing->fuel, max(0, $capacity - $destination->fuel));
        $ammunition = min($stationing->ammunition, max(0, $capacity - $destination->ammunition));
        $this->baseStore->addFuelAndAmmunition($stationing->destinationBaseId, $fuel, $ammunition);
        $this->stationings->emptyHold($aircraftId);
        if ($fuel > 0 || $ammunition > 0) {
            $this->events->record($stationing->destinationBaseId, [
                'kind' => 'landing',
                'from' => $this->bases->holderNameOf($stationing->originBaseId),
                'site' => $this->bases->siteOf($stationing->originBaseId)->value,
                'aircraftName' => $this->squadrons->aircraftById($stationing->originBaseId)[$aircraftId]->model->name,
                'fuel' => $fuel,
                'ammunition' => $ammunition,
            ]);
        }
    }
}
