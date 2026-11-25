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
 * one dogfight from the cockpit, a capture one dogfight from the cockpit for each aircraft that defends the camp, a ground attack or a raid one strafing run, a reconnaissance one run of photos, at a game second drawn between a quarter and three quarters of the flight. Played or not, the flight is received as usual.
 */
final class Alerts
{
    private const EARLIEST_PERCENT = 25;
    private const LATEST_PERCENT = 75;
    private const PERCENT = 100;
    private const NO_MOVES = 0;
    // The flak comes first on the way to an enemy camp: between a twentieth and a fifth of the flight.
    private const FLAK_EARLIEST_PERCENT = 5;
    private const FLAK_LATEST_PERCENT = 20;
    // The flak can hit an aircraft twice: the first hit damages it, the second destroys it.
    private const MAX_FLAK_HITS = 2;
    // A flak that was not played hits for each of its two shots by this much for each shell a second the guns fire, at most the cap.
    private const UNPLAYED_HIT_PERCENT_PER_SHELL = 8;
    private const UNPLAYED_HIT_PERCENT_CAP = 60;

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
     * @param int $flakShellsPerSecond how many shells a second the guns of the camp the flight goes against fire, for each aircraft: none when it goes against no camp
     * @param int $captureDefenders how many aircraft the camp a capture goes against has on the ground: the capture has a combat for each, flown by the aircraft in turn
     */
    public function schedule(Mission $mission, array $pilots, array $aircraft, int $launchGameSecond, int $flakShellsPerSecond, int $captureDefenders): void
    {
        $kind = match ($mission->type) {
            MissionType::AirCombat => AlertKind::Dogfight,
            MissionType::FighterCombat, MissionType::GroundAttack, MissionType::Raid, MissionType::CampCapture, MissionType::Reconnaissance => AlertKind::Cockpit,
            default => null,
        };
        if ($kind === null) {
            return;
        }
        if ($flakShellsPerSecond > 0) {
            $flakEarliest = intdiv($mission->durationSeconds * self::FLAK_EARLIEST_PERCENT, self::PERCENT);
            $flakLatest = intdiv($mission->durationSeconds * self::FLAK_LATEST_PERCENT, self::PERCENT);
            foreach ($aircraft as $flown) {
                $this->store->addFlak($mission->id, $flown->id, $launchGameSecond + $this->random->getInt($flakEarliest, $flakLatest), $flakShellsPerSecond);
            }
        }
        $earliest = intdiv($mission->durationSeconds * self::EARLIEST_PERCENT, self::PERCENT);
        $latest = intdiv($mission->durationSeconds * self::LATEST_PERCENT, self::PERCENT);
        if ($mission->type === MissionType::CampCapture) {
            for ($combat = 0; $combat < $captureDefenders; $combat += 1) {
                $due = $launchGameSecond + $earliest + intdiv(($latest - $earliest) * ($combat + 1), $captureDefenders + 1);
                $this->store->add($mission->id, $aircraft[$combat % count($aircraft)]->id, $kind, $due, self::NO_MOVES);
            }

            return;
        }
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
     * @return list<array{aircraftId: int, outcome: DogfightOutcome|null}> the combats of a capture in the order they come, each with the aircraft that flies it and how it ended, null if it was not played
     */
    public function combatsOf(int $baseId, int $missionId): array
    {
        $combats = [];
        foreach ($this->store->of($baseId) as $alert) {
            if ($alert->missionId === $missionId && $alert->kind === AlertKind::Cockpit) {
                $combats[] = ['aircraftId' => $alert->aircraftId, 'outcome' => $alert->outcome()];
            }
        }

        return $combats;
    }

    /**
     * @return array<int, EnemyType> the enemy that each aircraft of a flight met or was to meet, by the id of the aircraft
     */
    public function enemiesOf(int $baseId, int $missionId, Clan $clan): array
    {
        $enemies = [];
        foreach ($this->store->of($baseId) as $alert) {
            if ($alert->missionId === $missionId && $alert->kind !== AlertKind::Flak) {
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
            if ($alert->missionId === $missionId && $alert->kind !== AlertKind::Flak && $alert->isFinished()) {
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
            if ($alert->kind === AlertKind::Cockpit || $alert->kind === AlertKind::Flak) {
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
     * @throws BaseException when the base has no such alert, it is not a cockpit dogfight, it was not started, it is over, more was claimed than a run holds, or photos are claimed on a run that was lost
     */
    public function finish(int $baseId, int $alertId, DogfightOutcome $outcome, array $bonuses): void
    {
        foreach (BonusKind::cases() as $kind) {
            if ($bonuses[$kind->value] < 0 || $bonuses[$kind->value] > $kind->maxPerRun()) {
                throw new BaseException(BaseError::InvalidQuantity);
            }
        }
        if ($bonuses[BonusKind::Photo->value] > 0 && $outcome !== DogfightOutcome::Won) {
            throw new BaseException(BaseError::InvalidQuantity);
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
     * Keeps how many times the flak hit an aircraft, which the browser has played: two hits destroy it.
     *
     * @throws BaseException when the base has no such alert, it is not a flak, it was not started, it is over, or the hits are not 0, 1 or 2
     */
    public function finishFlak(int $baseId, int $alertId, int $hits): void
    {
        if ($hits < 0 || $hits > self::MAX_FLAK_HITS) {
            throw new BaseException(BaseError::InvalidQuantity);
        }
        $this->database->transaction(function () use ($baseId, $alertId, $hits): void {
            $this->bases->lockResources($baseId);
            $alert = $this->store->find($baseId, $alertId) ?? throw new BaseException(BaseError::UnknownAlert);
            if ($alert->kind !== AlertKind::Flak) {
                throw new BaseException(BaseError::AlertWrongKind);
            }
            if ($alert->cockpit === null) {
                throw new BaseException(BaseError::AlertNotStarted);
            }
            if ($alert->isFinished()) {
                throw new BaseException(BaseError::AlertDone);
            }
            $this->store->finishCockpit($alertId, $hits < self::MAX_FLAK_HITS ? DogfightOutcome::Won : DogfightOutcome::Escaped);
            $this->store->recordFlakHits($alertId, $hits);
        });
    }

    /**
     * @return array<int, int> how many times the flak hit each aircraft of a flight, by the id of the aircraft: as it was played, or drawn for a flak that was not played
     */
    public function flakHitsOf(int $baseId, int $missionId): array
    {
        $hits = [];
        foreach ($this->store->of($baseId) as $alert) {
            if ($alert->missionId === $missionId && $alert->kind === AlertKind::Flak) {
                $hits[$alert->aircraftId] = $alert->flakHits ?? $this->drawnHits($alert->flakShellsPerSecond ?? 0);
            }
        }

        return $hits;
    }

    private function drawnHits(int $shellsPerSecond): int
    {
        $percent = min(self::UNPLAYED_HIT_PERCENT_CAP, $shellsPerSecond * self::UNPLAYED_HIT_PERCENT_PER_SHELL);
        $hits = 0;
        for ($shot = 0; $shot < self::MAX_FLAK_HITS; $shot += 1) {
            if ($this->random->getInt(1, self::PERCENT) <= $percent) {
                $hits += 1;
            }
        }

        return $hits;
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
