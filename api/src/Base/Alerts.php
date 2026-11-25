<?php

declare(strict_types=1);

namespace Ww2\Base;

use Random\Randomizer;
use Ww2\Clock\GameClockStore;
use Ww2\Database\Database;
use Ww2\Mission\AlertKind;
use Ww2\Mission\BonusKind;
use Ww2\Mission\EnemyType;
use Ww2\Mission\FlightAlertStore;
use Ww2\Mission\Dogfight\Dogfight;
use Ww2\Mission\Dogfight\DogfightOutcome;
use Ww2\Mission\Dogfight\Maneuver;
use Ww2\Mission\Mission;
use Ww2\Mission\MissionType;
use Ww2\Squadron\Aircraft;
use Ww2\Squadron\Pilot;
use Ww2\World\Clan;

/**
 * The calls to the player during a flight, the toasts of the mini-games: an interception of bombers calls for one dogfight on the grid per aircraft, an air combat
 * one dogfight from the cockpit, a ground attack, a raid or a capture one strafing run, a reconnaissance one run of photos, at a game second drawn between a quarter and three quarters of the flight. Played or not, the flight is received as usual.
 */
final class Alerts
{
    private const EARLIEST_PERCENT = 25;
    private const LATEST_PERCENT = 75;
    private const PERCENT = 100;
    private const NO_MOVES = 0;

    public function __construct(
        private readonly Database $database,
        private readonly BaseStore $bases,
        private readonly GameClockStore $clocks,
        private readonly FlightAlertStore $store,
        private readonly Dogfight $dogfight,
        private readonly Randomizer $random = new Randomizer(),
    ) {
    }

    /**
     * Plans the alerts of a flight that has just left, at game seconds counted from its launch; each dogfight gives its crew as many moves as its aircraft and pilot allow.
     *
     * @param list<Pilot> $pilots the pilots of the flight, each flying the aircraft at the same place of the next list
     * @param list<Aircraft> $aircraft
     */
    public function schedule(Mission $mission, array $pilots, array $aircraft, int $launchGameSecond): void
    {
        $kind = match ($mission->type) {
            MissionType::AirCombat => AlertKind::Dogfight,
            MissionType::FighterCombat, MissionType::GroundAttack, MissionType::Raid, MissionType::CampCapture, MissionType::Reconnaissance => AlertKind::Cockpit,
            default => null,
        };
        if ($kind === null) {
            return;
        }
        $earliest = intdiv($mission->durationSeconds * self::EARLIEST_PERCENT, self::PERCENT);
        $latest = intdiv($mission->durationSeconds * self::LATEST_PERCENT, self::PERCENT);
        foreach ($aircraft as $place => $flown) {
            $moves = $kind === AlertKind::Dogfight ? $this->dogfight->movesFor($flown->model->maneuverability, $pilots[$place]->rank) : self::NO_MOVES;
            $this->store->add($mission->id, $flown->id, $kind, $launchGameSecond + $this->random->getInt($earliest, $latest), $moves);
        }
    }

    /**
     * @param Clan $clan the side of the base, which sets the enemy of each alert
     * @return array<int, list<array<string, mixed>>> the alerts of each flight of the base, by the id of the mission
     */
    public function describeByMission(int $baseId, int $gameSeconds, Clan $clan): array
    {
        $byMission = [];
        foreach ($this->store->of($baseId) as $alert) {
            $byMission[$alert->missionId][] = $alert->toArray($gameSeconds, EnemyType::of($clan, $alert->kind, $alert->id));
        }

        return $byMission;
    }

    /**
     * @return array<int, EnemyType> the enemy that each aircraft of a flight met or was to meet, by the id of the aircraft
     */
    public function enemiesOf(int $baseId, int $missionId, Clan $clan): array
    {
        $enemies = [];
        foreach ($this->store->of($baseId) as $alert) {
            if ($alert->missionId === $missionId) {
                $enemies[$alert->aircraftId] = EnemyType::of($clan, $alert->kind, $alert->id);
            }
        }

        return $enemies;
    }

    /**
     * @return array<int, DogfightOutcome> how the dogfights of a flight that are over ended, by the id of the aircraft
     */
    public function finishedDuelsOf(int $baseId, int $missionId): array
    {
        $duels = [];
        foreach ($this->store->of($baseId) as $alert) {
            if ($alert->missionId === $missionId && $alert->isFinished()) {
                $duels[$alert->aircraftId] = $alert->outcome();
            }
        }

        return $duels;
    }

    /**
     * Starts the dogfight of an alert that shows by now.
     *
     * @throws BaseException when the base has no such alert, it is not due yet, or it is over
     */
    public function start(int $baseId, int $alertId): void
    {
        $this->database->transaction(function () use ($baseId, $alertId): void {
            $this->bases->lockResources($baseId);
            $alert = $this->store->find($baseId, $alertId) ?? throw new BaseException(BaseError::UnknownAlert);
            if ($alert->isFinished()) {
                throw new BaseException(BaseError::AlertDone);
            }
            if ($alert->dueGameSecond > $this->clocks->of($baseId)->gameSeconds) {
                throw new BaseException(BaseError::AlertNotDue);
            }
            if ($alert->kind === AlertKind::Cockpit) {
                $this->store->startCockpit($alertId);
            } elseif ($alert->state === null) {
                $this->store->saveState($alertId, $this->dogfight->begin());
            }
        });
    }

    /**
     * Plays one turn of a dogfight that has been started.
     *
     * @throws BaseException when the base has no such alert, it was not started, or it is over
     */
    public function play(int $baseId, int $alertId, Maneuver $maneuver): void
    {
        $this->database->transaction(function () use ($baseId, $alertId, $maneuver): void {
            $this->bases->lockResources($baseId);
            $alert = $this->store->find($baseId, $alertId) ?? throw new BaseException(BaseError::UnknownAlert);
            if ($alert->kind !== AlertKind::Dogfight) {
                throw new BaseException(BaseError::AlertWrongKind);
            }
            if ($alert->state === null) {
                throw new BaseException(BaseError::AlertNotStarted);
            }
            if ($alert->isFinished()) {
                throw new BaseException(BaseError::AlertDone);
            }
            $this->store->saveState($alertId, $this->dogfight->play($alert->state, $alert->moves, $maneuver));
        });
    }

    /**
     * Keeps the result of a dogfight flown from the cockpit, which the browser has played.
     *
     * @param array<string, int> $bonuses what the player destroyed beside what the mission asks for, by the value of the kind: it pays when the squadron is received
     * @throws BaseException when the base has no such alert, it is not a cockpit dogfight, it was not started, it is over, or more was destroyed than a run holds
     */
    public function finish(int $baseId, int $alertId, DogfightOutcome $outcome, array $bonuses): void
    {
        foreach (BonusKind::cases() as $kind) {
            if ($bonuses[$kind->value] < 0 || $bonuses[$kind->value] > $kind->maxPerRun()) {
                throw new BaseException(BaseError::InvalidQuantity);
            }
        }
        $this->database->transaction(function () use ($baseId, $alertId, $outcome, $bonuses): void {
            $this->bases->lockResources($baseId);
            $alert = $this->store->find($baseId, $alertId) ?? throw new BaseException(BaseError::UnknownAlert);
            if ($alert->kind !== AlertKind::Cockpit) {
                throw new BaseException(BaseError::AlertWrongKind);
            }
            if ($alert->cockpit === null) {
                throw new BaseException(BaseError::AlertNotStarted);
            }
            if ($alert->isFinished()) {
                throw new BaseException(BaseError::AlertDone);
            }
            $this->store->finishCockpit($alertId, $outcome);
            $this->store->recordBonuses($alertId, $bonuses);
        });
    }

    /**
     * @return int the supplies that what the alerts of a flight destroyed beside what the mission asked for pays on top of the mission
     */
    public function bonusSuppliesOf(int $missionId): int
    {
        $supplies = 0;
        foreach ($this->store->bonusesOfMission($missionId) as $kind => $quantity) {
            $supplies += BonusKind::from($kind)->supplies() * $quantity;
        }

        return $supplies;
    }
}
