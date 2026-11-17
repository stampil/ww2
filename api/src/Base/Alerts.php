<?php

declare(strict_types=1);

namespace Ww2\Base;

use Random\Randomizer;
use Ww2\Clock\GameClockStore;
use Ww2\Database\Database;
use Ww2\Mission\AlertKind;
use Ww2\Mission\FlightAlertStore;
use Ww2\Mission\Dogfight\Dogfight;
use Ww2\Mission\Dogfight\DogfightState;
use Ww2\Mission\Dogfight\Maneuver;
use Ww2\Mission\Mission;
use Ww2\Mission\MissionType;
use Ww2\Squadron\Aircraft;
use Ww2\Squadron\Pilot;

/**
 * The calls to the player during a flight, the toasts of the mini-games: an air combat mission calls for one dogfight per aircraft,
 * at a game second drawn between a quarter and three quarters of the flight. Played or not, the flight is received as usual.
 */
final class Alerts
{
    private const EARLIEST_PERCENT = 25;
    private const LATEST_PERCENT = 75;
    private const PERCENT = 100;

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
        if ($mission->type !== MissionType::AirCombat) {
            return;
        }
        $earliest = intdiv($mission->durationSeconds * self::EARLIEST_PERCENT, self::PERCENT);
        $latest = intdiv($mission->durationSeconds * self::LATEST_PERCENT, self::PERCENT);
        foreach ($aircraft as $place => $flown) {
            $moves = $this->dogfight->movesFor($flown->model->maneuverability, $pilots[$place]->rank);
            $this->store->add($mission->id, $flown->id, AlertKind::Dogfight, $launchGameSecond + $this->random->getInt($earliest, $latest), $moves);
        }
    }

    /**
     * @return array<int, list<array<string, mixed>>> the alerts of each flight of the base, by the id of the mission
     */
    public function describeByMission(int $baseId, int $gameSeconds): array
    {
        $byMission = [];
        foreach ($this->store->of($baseId) as $alert) {
            $byMission[$alert->missionId][] = $alert->toArray($gameSeconds);
        }

        return $byMission;
    }

    /**
     * @return array<int, DogfightState> the dogfights of a flight that are over, by the id of the aircraft
     */
    public function finishedDuelsOf(int $baseId, int $missionId): array
    {
        $duels = [];
        foreach ($this->store->of($baseId) as $alert) {
            if ($alert->missionId === $missionId && $alert->isFinished()) {
                $duels[$alert->aircraftId] = $alert->state;
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
            if ($alert->state === null) {
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
            if ($alert->state === null) {
                throw new BaseException(BaseError::AlertNotStarted);
            }
            if ($alert->isFinished()) {
                throw new BaseException(BaseError::AlertDone);
            }
            $this->store->saveState($alertId, $this->dogfight->play($alert->state, $alert->moves, $maneuver));
        });
    }
}
