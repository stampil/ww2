<?php

declare(strict_types=1);

namespace Ww2\Base;

use Ww2\Clock\GameClock;
use Ww2\Clock\GameClockStore;
use Ww2\Database\Database;
use Ww2\Mission\Flight;
use Ww2\Mission\Mission;
use Ww2\Mission\MissionGenerator;
use Ww2\Mission\MissionReport;
use Ww2\Mission\MissionResolver;
use Ww2\Mission\MissionStore;
use Ww2\Mission\MissionType;
use Ww2\Mission\WeatherForecast;
use Ww2\Squadron\Aircraft;
use Ww2\Squadron\AircraftCategory;
use Ww2\Squadron\Pilot;
use Ww2\Squadron\SquadronStore;

/**
 * The headquarters: keeps a few missions on the table that the squadron can fly, sends squadrons out on them, and receives them back.
 * A flight lasts game seconds; its result is worked out when the squadron is received.
 */
final class Headquarters
{
    private const MISSIONS_ON_TABLE = 3;
    private const FIRE_SECONDS = 180;

    public function __construct(
        private readonly Database $database,
        private readonly BaseStore $bases,
        private readonly MissionStore $missions,
        private readonly SquadronStore $squadrons,
        private readonly GameClockStore $clocks,
        private readonly HangarStore $hangar,
        private readonly EventLog $events,
        private readonly MissionGenerator $generator,
        private readonly WeatherForecast $forecast,
        private readonly MissionResolver $resolver,
    ) {
    }

    /**
     * Draws new missions first when fewer than three are on the table, and drops those the squadron has no aircraft to fly.
     *
     * @param GameClock $clock the clock of the player, read once for the whole answer
     * @return array{weather: array<string, int>, offers: list<array<string, int|string|null>>, flights: list<array<string, mixed>>}
     */
    public function describe(int $playerId, GameClock $clock): array
    {
        $this->fillTable($playerId);

        return [
            'weather' => $this->forecast->at($clock->gameSeconds)->toArray(),
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
            $windSpeed = $this->forecast->at($gameSeconds)->windSpeed;
            $this->missions->launch($missionId, $gameSeconds + $mission->durationSeconds, $fuelPerAircraft, $ammunitionPerAircraft, $windSpeed);
            foreach ($pilotIds as $place => $pilotId) {
                $this->missions->addCrew($missionId, $pilotId, $aircraftIds[$place]);
            }
        });
    }

    /**
     * Receives a squadron back once its flight is over: the result is worked out, the damage and the losses are carried out,
     * the rewards are paid, and a report is kept. The pilots and the aircraft that are left are free again.
     *
     * @throws BaseException when the player has no such flight, or it is not over
     */
    public function receive(int $playerId, int $missionId): void
    {
        $this->database->transaction(function () use ($playerId, $missionId): void {
            $this->bases->lockResources($playerId);
            $gameSeconds = $this->clocks->of($playerId)->gameSeconds;
            $flight = $this->missions->flight($playerId, $missionId, $gameSeconds) ?? throw new BaseException(BaseError::UnknownMission);
            if ($flight->remainingSeconds > 0) {
                throw new BaseException(BaseError::StillInFlight);
            }
            $report = $this->resolver->resolve($flight, $this->pilotsById($playerId), $this->aircraftById($playerId));
            $this->applyReport($playerId, $report, $gameSeconds);
            $this->missions->remove($missionId);
            $this->events->record($playerId, $report->toArray());
        });
    }

    private function fillTable(int $playerId): void
    {
        if ($this->tableIsComplete($playerId)) {
            return;
        }
        $this->database->transaction(function () use ($playerId): void {
            $this->bases->lockResources($playerId);
            $categories = $this->aircraftCategoriesOf($playerId);
            $kept = 0;
            foreach ($this->missions->offersOf($playerId) as $offer) {
                if ($offer->type->isFlyableBy($categories)) {
                    $kept += 1;
                } else {
                    $this->missions->remove($offer->id);
                }
            }
            $types = [];
            foreach (MissionType::cases() as $type) {
                if ($type->isFlyableBy($categories)) {
                    $types[] = $type;
                }
            }
            for ($drawn = $kept; $drawn < self::MISSIONS_ON_TABLE; $drawn += 1) {
                $this->missions->addOffer($playerId, $this->generator->draw($types));
            }
        });
    }

    private function tableIsComplete(int $playerId): bool
    {
        $offers = $this->missions->offersOf($playerId);
        if (count($offers) < self::MISSIONS_ON_TABLE) {
            return false;
        }
        $categories = $this->aircraftCategoriesOf($playerId);
        foreach ($offers as $offer) {
            if (!$offer->type->isFlyableBy($categories)) {
                return false;
            }
        }

        return true;
    }

    /**
     * @return list<AircraftCategory> the category of each aircraft of the squadron
     */
    private function aircraftCategoriesOf(int $playerId): array
    {
        $categories = [];
        foreach ($this->squadrons->aircraftOf($playerId) as $aircraft) {
            $categories[] = $aircraft->model->category;
        }

        return $categories;
    }

    /**
     * @return array<int, Pilot>
     */
    private function pilotsById(int $playerId): array
    {
        $pilots = [];
        foreach ($this->squadrons->pilotsOf($playerId) as $pilot) {
            $pilots[$pilot->id] = $pilot;
        }

        return $pilots;
    }

    /**
     * @return array<int, Aircraft>
     */
    private function aircraftById(int $playerId): array
    {
        $aircraft = [];
        foreach ($this->squadrons->aircraftOf($playerId) as $owned) {
            $aircraft[$owned->id] = $owned;
        }

        return $aircraft;
    }

    private function applyReport(int $playerId, MissionReport $report, int $gameSeconds): void
    {
        foreach ($report->crews as $crew) {
            if ($crew->pilotKilled) {
                $this->squadrons->removePilot($crew->pilotId);
            } else {
                $this->squadrons->updatePilotGauges($crew->pilotId, $crew->fatigue, $crew->stress);
            }
            if ($crew->aircraftLost) {
                $this->squadrons->removeAircraft($crew->aircraftId);
                continue;
            }
            $this->squadrons->setAircraftDurability($crew->aircraftId, $crew->durability);
            foreach ($crew->destroyedModules as $part) {
                $this->hangar->destroyModule($crew->aircraftId, $part);
            }
            if ($crew->burning) {
                $this->hangar->ignite($crew->aircraftId, $crew->pilotId, $gameSeconds + self::FIRE_SECONDS);
            }
        }
        $this->bases->addRewards($playerId, $report->suppliesWon, $report->commandPointsWon);
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
        $ownedPilots = $this->pilotsById($playerId);
        $resting = $this->squadrons->restsOf($playerId);
        foreach ($pilotIds as $pilotId) {
            if (!isset($ownedPilots[$pilotId])) {
                throw new BaseException(BaseError::InvalidCrew);
            }
            if (isset($resting[$pilotId])) {
                throw new BaseException(BaseError::PilotResting);
            }
        }
        $ownedAircraft = $this->aircraftById($playerId);
        $chosen = [];
        $category = $mission->type->profile()->category;
        $grounded = $this->hangar->groundedAircraftIds($playerId);
        foreach ($aircraftIds as $aircraftId) {
            if (!isset($ownedAircraft[$aircraftId])) {
                throw new BaseException(BaseError::InvalidCrew);
            }
            if ($category !== null && $ownedAircraft[$aircraftId]->model->category !== $category) {
                throw new BaseException(BaseError::AircraftNotSuited);
            }
            if (in_array($aircraftId, $grounded, true)) {
                throw new BaseException(BaseError::AircraftGrounded);
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
