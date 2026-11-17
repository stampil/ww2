<?php

declare(strict_types=1);

namespace Ww2\Base;

use Ww2\Clock\GameClock;
use Ww2\Clock\GameClockStore;
use Ww2\Database\Database;
use Ww2\Mission\Flight;
use Ww2\Mission\Mission;
use Ww2\Mission\MissionGenerator;
use Ww2\Mission\MissionStore;
use Ww2\Squadron\Aircraft;
use Ww2\Squadron\Pilot;
use Ww2\Squadron\SquadronStore;

/**
 * The headquarters: keeps a few missions on the table, sends squadrons out on them, and receives them back.
 * A flight lasts game seconds, so a pause stops it.
 */
final class Headquarters
{
    private const MISSIONS_ON_TABLE = 3;

    public function __construct(
        private readonly Database $database,
        private readonly BaseStore $bases,
        private readonly MissionStore $missions,
        private readonly SquadronStore $squadrons,
        private readonly GameClockStore $clocks,
        private readonly MissionGenerator $generator,
    ) {
    }

    /**
     * Draws new missions first when fewer than three are on the table.
     *
     * @param GameClock $clock the clock of the player, read once for the whole answer
     * @return array{offers: list<array<string, int|string|null>>, flights: list<array<string, mixed>>}
     */
    public function describe(int $playerId, GameClock $clock): array
    {
        $this->fillTable($playerId);

        return [
            'offers' => array_map(static fn (Mission $mission): array => $mission->toArray(), $this->missions->offersOf($playerId)),
            'flights' => array_map(static fn (Flight $flight): array => $flight->toArray(), $this->missions->flightsOf($playerId, $clock->gameSeconds)),
        ];
    }

    /**
     * Sends a mission out: the pilots and the aircraft are paired by their place in the lists, and each aircraft takes the same load.
     *
     * @param list<int> $pilotIds
     * @param list<int> $aircraftIds
     * @throws BaseException when the mission, the crews, the load or the stocks do not allow the flight
     */
    public function launch(int $playerId, int $missionId, array $pilotIds, array $aircraftIds, int $fuelPerAircraft, int $ammunitionPerAircraft): void
    {
        $this->database->transaction(function () use ($playerId, $missionId, $pilotIds, $aircraftIds, $fuelPerAircraft, $ammunitionPerAircraft): void {
            $resources = $this->bases->lockResources($playerId);
            $gameSeconds = $this->clocks->of($playerId)->gameSeconds;
            $mission = $this->missions->offer($playerId, $missionId) ?? throw new BaseException(BaseError::UnknownMission);
            $aircraft = $this->freeCrew($playerId, $mission, $pilotIds, $aircraftIds, $gameSeconds);
            $this->checkLoad($aircraft, $fuelPerAircraft, $ammunitionPerAircraft);
            $fuelTotal = $fuelPerAircraft * $mission->aircraftCount;
            $ammunitionTotal = $ammunitionPerAircraft * $mission->aircraftCount;
            if ($resources->fuel < $fuelTotal) {
                throw new BaseException(BaseError::InsufficientFuel);
            }
            if ($resources->ammunition < $ammunitionTotal) {
                throw new BaseException(BaseError::InsufficientAmmunition);
            }
            $this->bases->spendFuelAndAmmunition($playerId, $fuelTotal, $ammunitionTotal);
            $this->missions->launch($missionId, $gameSeconds + $mission->durationSeconds, $fuelPerAircraft, $ammunitionPerAircraft);
            foreach ($pilotIds as $place => $pilotId) {
                $this->missions->addCrew($missionId, $pilotId, $aircraftIds[$place]);
            }
        });
    }

    /**
     * Receives a squadron back once its flight is over, which frees its pilots and its aircraft.
     * The result of the mission is not counted yet.
     *
     * @throws BaseException when the player has no such flight, or it is not over
     */
    public function receive(int $playerId, int $missionId): void
    {
        $this->database->transaction(function () use ($playerId, $missionId): void {
            $this->bases->lockResources($playerId);
            $flight = $this->missions->flight($playerId, $missionId, $this->clocks->of($playerId)->gameSeconds)
                ?? throw new BaseException(BaseError::UnknownMission);
            if ($flight->remainingSeconds > 0) {
                throw new BaseException(BaseError::StillInFlight);
            }
            $this->missions->remove($missionId);
        });
    }

    private function fillTable(int $playerId): void
    {
        if ($this->missions->offerCount($playerId) >= self::MISSIONS_ON_TABLE) {
            return;
        }
        $this->database->transaction(function () use ($playerId): void {
            $this->bases->lockResources($playerId);
            $missing = self::MISSIONS_ON_TABLE - $this->missions->offerCount($playerId);
            for ($drawn = 0; $drawn < $missing; $drawn += 1) {
                $this->missions->addOffer($playerId, $this->generator->draw());
            }
        });
    }

    /**
     * @param list<int> $pilotIds
     * @param list<int> $aircraftIds
     * @return list<Aircraft> the aircraft chosen, in the order of the ids
     * @throws BaseException when the crews are not the right number, not the player's, not suited, or already on a flight
     */
    private function freeCrew(int $playerId, Mission $mission, array $pilotIds, array $aircraftIds, int $gameSeconds): array
    {
        if (count($pilotIds) !== $mission->aircraftCount || count($aircraftIds) !== $mission->aircraftCount) {
            throw new BaseException(BaseError::InvalidCrew);
        }
        if (count(array_unique($pilotIds)) !== count($pilotIds) || count(array_unique($aircraftIds)) !== count($aircraftIds)) {
            throw new BaseException(BaseError::InvalidCrew);
        }
        $ownedPilotIds = array_map(static fn (Pilot $pilot): int => $pilot->id, $this->squadrons->pilotsOf($playerId));
        foreach ($pilotIds as $pilotId) {
            if (!in_array($pilotId, $ownedPilotIds, true)) {
                throw new BaseException(BaseError::InvalidCrew);
            }
        }
        $ownedAircraft = [];
        foreach ($this->squadrons->aircraftOf($playerId) as $aircraft) {
            $ownedAircraft[$aircraft->id] = $aircraft;
        }
        $chosen = [];
        $category = $mission->type->profile()->category;
        foreach ($aircraftIds as $aircraftId) {
            if (!isset($ownedAircraft[$aircraftId])) {
                throw new BaseException(BaseError::InvalidCrew);
            }
            if ($category !== null && $ownedAircraft[$aircraftId]->model->category !== $category) {
                throw new BaseException(BaseError::AircraftNotSuited);
            }
            $chosen[] = $ownedAircraft[$aircraftId];
        }
        foreach ($this->missions->flightsOf($playerId, $gameSeconds) as $flight) {
            foreach ($flight->crews as $crew) {
                if (in_array($crew['pilotId'], $pilotIds, true) || in_array($crew['aircraftId'], $aircraftIds, true)) {
                    throw new BaseException(BaseError::CrewBusy);
                }
            }
        }

        return $chosen;
    }

    /**
     * @param list<Aircraft> $aircraft
     * @throws BaseException when a load is negative or more than an aircraft can carry
     */
    private function checkLoad(array $aircraft, int $fuelPerAircraft, int $ammunitionPerAircraft): void
    {
        if ($fuelPerAircraft < 0 || $ammunitionPerAircraft < 0) {
            throw new BaseException(BaseError::InvalidLoad);
        }
        foreach ($aircraft as $loaded) {
            if ($fuelPerAircraft > $loaded->model->fuelCapacity || $ammunitionPerAircraft > $loaded->model->ammunitionCapacity) {
                throw new BaseException(BaseError::InvalidLoad);
            }
        }
    }
}
