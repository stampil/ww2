<?php

declare(strict_types=1);

namespace Ww2\Base;

use Ww2\Clock\GameClock;
use Ww2\Clock\GameClockStore;
use Ww2\Database\Database;
use Ww2\Mission\EnemyType;
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
use Ww2\Squadron\PilotProgress;
use Ww2\Squadron\PilotRecord;
use Ww2\Squadron\SquadronStore;
use Ww2\World\Bases;

/**
 * The headquarters: keeps a few missions on the table that the squadron can fly, sends squadrons out on them, and receives them back.
 * A flight lasts game seconds; its result is worked out when the squadron is received, and a reconnaissance that succeeded spots one better paid mission.
 */
final class Headquarters
{
    private const MISSIONS_ON_TABLE = 3;
    private const SPOTTED_REWARD_PERCENT = 150;
    private const FIRE_SECONDS = 180;

    public function __construct(
        private readonly Database $database,
        private readonly BaseStore $bases,
        private readonly MissionStore $missions,
        private readonly SquadronStore $squadrons,
        private readonly GameClockStore $clocks,
        private readonly HangarStore $hangar,
        private readonly EventLog $events,
        private readonly BattleStore $battles,
        private readonly MissionGenerator $generator,
        private readonly WeatherForecast $forecast,
        private readonly MissionResolver $resolver,
        private readonly Alerts $alerts,
        private readonly StationingStore $stationings,
        private readonly CampStore $camps,
        private readonly Attacks $attacks,
        private readonly Bases $world,
        private readonly Garrison $garrison,
    ) {
    }

    /**
     * Draws new missions first when fewer than three are on the table, and drops those the squadron has no aircraft to fly.
     *
     * @param GameClock $clock the clock of the base, read once for the whole answer
     * @return array{weather: array<string, int>, offers: list<array<string, int|string|null>>, flights: list<array<string, mixed>>}
     *                                                                                                       each flight carries its alerts
     */
    public function describe(int $baseId, GameClock $clock): array
    {
        $this->fillTable($baseId);
        $alerts = $this->alerts->describeByMission($baseId, $clock->gameSeconds, $this->world->clanOfBase($baseId));
        $flights = [];
        foreach ($this->missions->flightsOf($baseId, $clock->gameSeconds) as $flight) {
            $flights[] = $flight->toArray() + ['alerts' => $alerts[$flight->mission->id] ?? []];
        }

        return [
            'weather' => $this->forecast->at($clock->gameSeconds)->toArray(),
            'offers' => array_map(static fn (Mission $mission): array => $mission->toArray(), $this->missions->offersOf($baseId)),
            'flights' => $flights,
        ];
    }

    /**
     * Sends a mission out: the pilots and the aircraft are paired by their place in the lists, and each aircraft takes the same load.
     * The aircraft of other bases standing at the camp fly it too, with the pilots of the camp.
     *
     * @param list<int> $pilotIds
     * @param list<int> $aircraftIds
     * @throws BaseException when the mission, the crews, the load or the stocks do not allow the flight
     */
    public function launch(int $baseId, int $missionId, array $pilotIds, array $aircraftIds, int $fuelPerAircraft, int $ammunitionPerAircraft): void
    {
        $this->database->transaction(function () use ($baseId, $missionId, $pilotIds, $aircraftIds, $fuelPerAircraft, $ammunitionPerAircraft): void {
            $this->depart($baseId, $missionId, $pilotIds, $aircraftIds, $fuelPerAircraft, $ammunitionPerAircraft, mayUseGuests: true);
        });
    }

    /**
     * Sends a raid or a capture against an enemy camp: the mission is made for the camp and launched at once, with as many aircraft as pilots are given.
     *
     * @param list<int> $pilotIds
     * @param list<int> $aircraftIds
     * @throws BaseException when the camp cannot be attacked this way, or the crews, the load or the stocks do not allow the flight
     */
    public function launchAttack(int $baseId, int $targetBaseId, MissionType $type, array $pilotIds, array $aircraftIds): void
    {
        $this->database->transaction(function () use ($baseId, $targetBaseId, $type, $pilotIds, $aircraftIds): void {
            $this->bases->lockResources($baseId);
            $this->attacks->assertTarget($baseId, $targetBaseId, $type, $this->clocks->of($baseId)->gameSeconds);
            $aircraftCount = count($aircraftIds);
            $profile = $type->profile();
            if ($aircraftCount < $profile->aircraftCount->min || $aircraftCount > $profile->aircraftCount->max) {
                throw new BaseException(BaseError::InvalidCrew);
            }
            $mission = $this->attacks->missionFor($baseId, $targetBaseId, $type, $aircraftCount);
            $missionId = $this->missions->addAttack($baseId, $mission, $targetBaseId);
            $this->depart($baseId, $missionId, $pilotIds, $aircraftIds, $mission->fuelPerAircraft, $mission->ammunitionPerAircraft, mayUseGuests: false);
        });
    }

    /**
     * @param list<int> $pilotIds
     * @param list<int> $aircraftIds
     * @param bool $mayUseGuests whether the aircraft of other bases standing at the camp may fly: not an attack, whose aircraft land on the camp it takes
     */
    private function depart(int $baseId, int $missionId, array $pilotIds, array $aircraftIds, int $fuelPerAircraft, int $ammunitionPerAircraft, bool $mayUseGuests): void
    {
        $resources = $this->bases->lockResources($baseId);
        $this->camps->assertStanding($baseId, Building::Headquarters);
        $gameSeconds = $this->clocks->of($baseId)->gameSeconds;
        $mission = $this->missions->offer($baseId, $missionId) ?? throw new BaseException(BaseError::UnknownMission);
        $aircraft = $this->freeCrew($baseId, $mission, $pilotIds, $aircraftIds, $gameSeconds, $mayUseGuests);
        $this->checkLoad($aircraft, $fuelPerAircraft, $ammunitionPerAircraft);
        $fuelTotal = $fuelPerAircraft * $mission->aircraftCount;
        $ammunitionTotal = $ammunitionPerAircraft * $mission->aircraftCount;
        if ($resources->fuel < $fuelTotal) {
            throw new BaseException(BaseError::InsufficientFuel);
        }
        if ($resources->ammunition < $ammunitionTotal) {
            throw new BaseException(BaseError::InsufficientAmmunition);
        }
        $this->bases->spendFuelAndAmmunition($baseId, $fuelTotal, $ammunitionTotal);
        $windSpeed = $this->forecast->at($gameSeconds)->windSpeed;
        $this->missions->launch($missionId, $gameSeconds + $mission->durationSeconds, $fuelPerAircraft, $ammunitionPerAircraft, $windSpeed);
        foreach ($pilotIds as $place => $pilotId) {
            $this->missions->addCrew($missionId, $pilotId, $aircraftIds[$place]);
        }
        $ownedPilots = $this->squadrons->pilotsById($baseId);
        $crewPilots = [];
        foreach ($pilotIds as $pilotId) {
            $crewPilots[] = $ownedPilots[$pilotId];
        }
        $this->alerts->schedule($mission, $crewPilots, $aircraft, $gameSeconds);
    }

    /**
     * Receives a squadron back once its flight is over: the result is worked out, the damage and the losses are carried out,
     * the rewards are paid, and a report is kept. The pilots and the aircraft that are left are free again.
     *
     * @throws BaseException when the base has no such flight, or it is not over
     */
    public function receive(int $baseId, int $missionId): void
    {
        $this->database->transaction(function () use ($baseId, $missionId): void {
            $this->bases->lockResources($baseId);
            $gameSeconds = $this->clocks->of($baseId)->gameSeconds;
            $flight = $this->missions->flight($baseId, $missionId, $gameSeconds) ?? throw new BaseException(BaseError::UnknownMission);
            if ($flight->remainingSeconds > 0) {
                throw new BaseException(BaseError::StillInFlight);
            }
            $duels = $this->alerts->finishedDuelsOf($baseId, $missionId);
            $flyable = $this->squadrons->aircraftById($baseId);
            foreach ($this->garrison->guestsAt($baseId, $gameSeconds) as $aircraftId => $guest) {
                $flyable[$aircraftId] = $guest->aircraft;
            }
            $report = $this->resolver->resolve($flight, $this->squadrons->pilotsById($baseId), $flyable, $duels);
            $progress = $this->applyReport($baseId, $report, $gameSeconds, $this->alerts->enemiesOf($baseId, $missionId, $this->world->clanOfBase($baseId)));
            $attack = $this->attacks->resolve($baseId, $flight, $report, $gameSeconds);
            $this->missions->remove($missionId);
            $spotted = false;
            if ($report->success && $report->type === MissionType::Reconnaissance) {
                $spotted = $this->spotMission($baseId);
            }
            $entry = $report->toArray();
            foreach ($report->crews as $place => $crew) {
                $entry['crews'][$place] += $progress[$crew->pilotId]->toArray();
            }
            $this->events->record($baseId, $entry + ['spottedMission' => $spotted, 'targetSite' => $flight->targetSite, 'attack' => $attack]);
        });
    }

    /**
     * Puts a mission on the table beyond the usual three, paid more than the usual, unless the table already holds a fourth.
     *
     * @return bool whether a mission was put on the table
     */
    private function spotMission(int $baseId): bool
    {
        if (count($this->missions->offersOf($baseId)) > self::MISSIONS_ON_TABLE) {
            return false;
        }
        $this->missions->addOffer($baseId, $this->generator->draw($this->flyableTypesFor($this->aircraftCategoriesOf($baseId)), self::SPOTTED_REWARD_PERCENT));

        return true;
    }

    private function fillTable(int $baseId): void
    {
        if ($this->tableIsComplete($baseId)) {
            return;
        }
        $this->database->transaction(function () use ($baseId): void {
            $this->bases->lockResources($baseId);
            $categories = $this->aircraftCategoriesOf($baseId);
            $kept = 0;
            foreach ($this->missions->offersOf($baseId) as $offer) {
                if ($offer->type->isFlyableBy($categories)) {
                    $kept += 1;
                } else {
                    $this->missions->remove($offer->id);
                }
            }
            $types = $this->flyableTypesFor($categories);
            for ($drawn = $kept; $drawn < self::MISSIONS_ON_TABLE; $drawn += 1) {
                $this->missions->addOffer($baseId, $this->generator->draw($types));
            }
        });
    }

    /**
     * @param list<AircraftCategory> $categories the categories of the aircraft a squadron has
     * @return non-empty-list<MissionType> the types of mission such a squadron can fly, a reconnaissance always among them
     */
    private function flyableTypesFor(array $categories): array
    {
        $types = [];
        foreach (MissionType::cases() as $type) {
            if (!$type->isAttack() && $type->isFlyableBy($categories)) {
                $types[] = $type;
            }
        }

        return $types;
    }

    private function tableIsComplete(int $baseId): bool
    {
        $offers = $this->missions->offersOf($baseId);
        if (count($offers) < self::MISSIONS_ON_TABLE) {
            return false;
        }
        $categories = $this->aircraftCategoriesOf($baseId);
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
    private function aircraftCategoriesOf(int $baseId): array
    {
        $categories = [];
        foreach ($this->squadrons->aircraftOf($baseId) as $aircraft) {
            $categories[] = $aircraft->model->category;
        }

        return $categories;
    }

    /**
     * @param array<int, EnemyType> $enemies the enemy each aircraft of the flight met, by the id of the aircraft
     * @return array<int, PilotProgress> what the flight made of each pilot of the crews, by the id of the pilot
     */
    private function applyReport(int $baseId, MissionReport $report, int $gameSeconds, array $enemies): array
    {
        $progress = [];
        foreach ($report->crews as $crew) {
            $progress[$crew->pilotId] = $this->squadrons->recordFlight($crew->pilotId, PilotRecord::ofFlight($report->type->isAirCombat(), $report->type->isGroundStrike(), $crew->succeeded, $crew->aircraftLost, $enemies[$crew->aircraftId]));
            if ($crew->pilotKilled) {
                $this->squadrons->bury($crew->pilotId);
            } else {
                $this->squadrons->updatePilotGauges($crew->pilotId, $crew->fatigue, $crew->stress);
            }
            if ($crew->aircraftLost) {
                $this->squadrons->destroyAircraft($crew->aircraftId);
                continue;
            }
            $this->squadrons->setAircraftDurability($crew->aircraftId, $crew->durability);
            foreach ($crew->destroyedModules as $part) {
                $this->hangar->destroyModule($crew->aircraftId, $part);
            }
            if ($crew->damage > 0 || $crew->burning) {
                $this->hangar->requireInspection($crew->aircraftId);
            }
            if ($crew->burning) {
                $this->hangar->ignite($crew->aircraftId, $crew->pilotId, $gameSeconds + self::FIRE_SECONDS);
            }
        }
        $this->bases->addRewards($baseId, $report->suppliesWon, $report->commandPointsWon);
        if ($report->type->isAirCombat()) {
            $kills = 0;
            foreach ($report->crews as $crew) {
                if ($crew->succeeded) {
                    $kills += 1;
                }
            }
            $this->battles->addKills($baseId, $kills);
        }

        return $progress;
    }

    /**
     * @param list<int> $pilotIds
     * @param list<int> $aircraftIds
     * @return list<Aircraft> the aircraft chosen, in the order of the ids
     * @throws BaseException when the crews are not the right number, not the base's or a guest's, not suited, or already on a flight
     */
    private function freeCrew(int $baseId, Mission $mission, array $pilotIds, array $aircraftIds, int $gameSeconds, bool $mayUseGuests): array
    {
        if (count($pilotIds) !== $mission->aircraftCount || count($aircraftIds) !== $mission->aircraftCount) {
            throw new BaseException(BaseError::InvalidCrew);
        }
        if (count(array_unique($pilotIds)) !== count($pilotIds) || count(array_unique($aircraftIds)) !== count($aircraftIds)) {
            throw new BaseException(BaseError::InvalidCrew);
        }
        $ownedPilots = $this->squadrons->pilotsById($baseId);
        $resting = $this->squadrons->restsOf($baseId);
        foreach ($pilotIds as $pilotId) {
            if (!isset($ownedPilots[$pilotId])) {
                throw new BaseException(BaseError::InvalidCrew);
            }
            if (isset($resting[$pilotId])) {
                throw new BaseException(BaseError::PilotResting);
            }
        }
        $ownedAircraft = $this->squadrons->aircraftById($baseId);
        $guests = $mayUseGuests ? $this->garrison->guestsAt($baseId, $gameSeconds) : [];
        $chosen = [];
        $category = $mission->type->profile()->category;
        $grounded = $this->hangar->groundedAircraftIds($baseId);
        foreach ($aircraftIds as $aircraftId) {
            if (isset($guests[$aircraftId])) {
                $aircraft = $guests[$aircraftId]->aircraft;
                $isGrounded = $guests[$aircraftId]->isGrounded;
            } elseif (isset($ownedAircraft[$aircraftId])) {
                $aircraft = $ownedAircraft[$aircraftId];
                $isGrounded = in_array($aircraftId, $grounded, true);
            } else {
                throw new BaseException(BaseError::InvalidCrew);
            }
            if ($category !== null && $aircraft->model->category !== $category) {
                throw new BaseException(BaseError::AircraftNotSuited);
            }
            if ($isGrounded) {
                throw new BaseException(BaseError::AircraftGrounded);
            }
            $chosen[] = $aircraft;
        }
        foreach ($this->missions->flightsOf($baseId, $gameSeconds) as $flight) {
            foreach ($flight->crews as $crew) {
                if (in_array($crew['pilotId'], $pilotIds, true) || in_array($crew['aircraftId'], $aircraftIds, true)) {
                    throw new BaseException(BaseError::CrewBusy);
                }
            }
        }
        foreach ($pilotIds as $pilotId) {
            if ($this->stationings->isPilotAway($pilotId, $gameSeconds)) {
                throw new BaseException(BaseError::CrewBusy);
            }
        }
        foreach ($aircraftIds as $aircraftId) {
            if (!isset($guests[$aircraftId]) && $this->stationings->isAircraftAway($aircraftId, $gameSeconds)) {
                throw new BaseException(BaseError::CrewBusy);
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
