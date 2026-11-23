<?php

declare(strict_types=1);

namespace Ww2\Base;

use Random\Randomizer;
use Ww2\Clock\GameClock;
use Ww2\Clock\GameClockStore;
use Ww2\Database\Database;
use Ww2\Mission\MissionStore;
use Ww2\Squadron\Aircraft;
use Ww2\Squadron\Pilot;
use Ww2\Squadron\SquadronStore;

/**
 * The hangar and the runway: an aircraft back damaged is inspected by a free mechanic before its damage is known and repaired;
 * a repair takes a free mechanic and a spare part for each destroyed module. An aircraft on fire that is not repaired in time explodes.
 */
final class Hangar
{
    /** How many aircraft a hangar takes: the stands of the starting plan, which the front keeps equal. */
    public const PLACES = 6;
    private const INSPECTION_SECONDS = 20;
    private const HULL_SECONDS_PER_POINT = 1;
    private const MODULE_SECONDS = 30;
    private const EXPLOSION_KILL_PERCENT = 50;
    private const PERCENT = 100;

    public function __construct(
        private readonly Database $database,
        private readonly BaseStore $bases,
        private readonly HangarStore $hangar,
        private readonly MissionStore $missions,
        private readonly SquadronStore $squadrons,
        private readonly GameClockStore $clocks,
        private readonly Mechanics $mechanics,
        private readonly EventLog $events,
        private readonly CampStore $camps,
        private readonly Randomizer $random = new Randomizer(),
    ) {
    }

    /**
     * Settles what is due first: inspections and repairs that are done, fires that reached the fuel. While an aircraft is to inspect,
     * its destroyed modules and the length of its repair are not known (null).
     *
     * @param GameClock $clock the clock of the base, read once for the whole answer
     * @return array{aircraft: list<array{aircraftId: int, needsInspection: bool, inspectionDurationSeconds: int, inspectionSeconds: int|null, destroyedModules: list<string>|null, repairDurationSeconds: int|null, repairSeconds: int|null, fireSeconds: int|null}>}
     */
    public function describe(int $baseId, GameClock $clock): array
    {
        $this->settle($baseId, $clock->gameSeconds);
        $destroyed = $this->hangar->destroyedModulesOf($baseId);
        $inspections = $this->hangar->inspectionsOf($baseId);
        $repairs = $this->hangar->repairsOf($baseId);
        $fires = $this->hangar->firesOf($baseId);
        $states = [];
        foreach ($this->squadrons->aircraftOf($baseId) as $aircraft) {
            $modules = $destroyed[$aircraft->id] ?? [];
            $needsInspection = array_key_exists($aircraft->id, $inspections);
            $states[] = [
                'aircraftId' => $aircraft->id,
                'needsInspection' => $needsInspection,
                'inspectionDurationSeconds' => self::INSPECTION_SECONDS,
                'inspectionSeconds' => isset($inspections[$aircraft->id]) ? max(0, $inspections[$aircraft->id] - $clock->gameSeconds) : null,
                'destroyedModules' => $needsInspection ? null : array_map(static fn (SparePart $part): string => $part->value, $modules),
                'repairDurationSeconds' => $needsInspection ? null : $this->repairDuration($aircraft, count($modules)),
                'repairSeconds' => isset($repairs[$aircraft->id]) ? max(0, $repairs[$aircraft->id] - $clock->gameSeconds) : null,
                'fireSeconds' => isset($fires[$aircraft->id]) ? max(0, $fires[$aircraft->id]['explodesAt'] - $clock->gameSeconds) : null,
            ];
        }

        return ['aircraft' => $states];
    }

    /**
     * @throws BaseException when the aircraft is not the base's, has nothing to inspect, is already being inspected, or when no mechanic is free
     */
    public function inspect(int $baseId, int $aircraftId): void
    {
        $this->database->transaction(function () use ($baseId, $aircraftId): void {
            $this->bases->lockResources($baseId);
            $this->camps->assertStanding($baseId, Building::Hangar);
            $gameSeconds = $this->clocks->of($baseId)->gameSeconds;
            if (!array_key_exists($aircraftId, $this->squadrons->aircraftById($baseId))) {
                throw new BaseException(BaseError::UnknownAircraft);
            }
            $inspections = $this->hangar->inspectionsOf($baseId);
            if (!array_key_exists($aircraftId, $inspections)) {
                throw new BaseException(BaseError::NothingToInspect);
            }
            if ($inspections[$aircraftId] !== null) {
                throw new BaseException(BaseError::AircraftUnderInspection);
            }
            if ($this->mechanics->freeAt($baseId, $gameSeconds) < 1) {
                throw new BaseException(BaseError::NoMechanicFree);
            }
            $this->hangar->startInspection($aircraftId, $gameSeconds + self::INSPECTION_SECONDS);
        });
    }

    /**
     * @throws BaseException when the aircraft is not the base's, is flying, is not inspected, is already being repaired, has nothing to repair,
     *                       or when no mechanic is free or a spare part is missing
     */
    public function repair(int $baseId, int $aircraftId): void
    {
        $this->database->transaction(function () use ($baseId, $aircraftId): void {
            $this->bases->lockResources($baseId);
            $this->camps->assertStanding($baseId, Building::Hangar);
            $gameSeconds = $this->clocks->of($baseId)->gameSeconds;
            $aircraft = $this->squadrons->aircraftById($baseId)[$aircraftId] ?? throw new BaseException(BaseError::UnknownAircraft);
            if ($this->missions->isOnFlight($aircraftId)) {
                throw new BaseException(BaseError::CrewBusy);
            }
            if (array_key_exists($aircraftId, $this->hangar->inspectionsOf($baseId))) {
                throw new BaseException(BaseError::NotInspected);
            }
            if (isset($this->hangar->repairsOf($baseId)[$aircraftId])) {
                throw new BaseException(BaseError::AircraftUnderRepair);
            }
            $destroyed = $this->hangar->destroyedModulesOf($baseId)[$aircraftId] ?? [];
            $duration = $this->repairDuration($aircraft, count($destroyed));
            if ($duration === 0) {
                throw new BaseException(BaseError::NothingToRepair);
            }
            if ($this->mechanics->freeAt($baseId, $gameSeconds) < 1) {
                throw new BaseException(BaseError::NoMechanicFree);
            }
            foreach ($destroyed as $part) {
                if (!$this->bases->useReadyPart($baseId, $part, $gameSeconds)) {
                    throw new BaseException(BaseError::MissingSparePart);
                }
            }
            $this->hangar->startRepair($aircraftId, $gameSeconds + $duration);
            $this->hangar->extinguish($aircraftId);
        });
    }

    private function repairDuration(Aircraft $aircraft, int $destroyedModules): int
    {
        return ($aircraft->model->durability - $aircraft->durability) * self::HULL_SECONDS_PER_POINT + $destroyedModules * self::MODULE_SECONDS;
    }

    private function settle(int $baseId, int $gameSeconds): void
    {
        if (!$this->hasDueWork($baseId, $gameSeconds)) {
            return;
        }
        $this->database->transaction(function () use ($baseId, $gameSeconds): void {
            $this->bases->lockResources($baseId);
            $aircraft = $this->squadrons->aircraftById($baseId);
            foreach ($this->hangar->inspectionsOf($baseId) as $aircraftId => $finishGameSecond) {
                if ($finishGameSecond !== null && $finishGameSecond <= $gameSeconds) {
                    $this->hangar->finishInspection($aircraftId);
                }
            }
            foreach ($this->hangar->repairsOf($baseId) as $aircraftId => $finishGameSecond) {
                if ($finishGameSecond <= $gameSeconds) {
                    $this->squadrons->setAircraftDurability($aircraftId, $aircraft[$aircraftId]->model->durability);
                    $this->hangar->clearModules($aircraftId);
                    $this->hangar->finishRepair($aircraftId);
                }
            }
            foreach ($this->hangar->firesOf($baseId) as $aircraftId => $fire) {
                if ($fire['explodesAt'] <= $gameSeconds) {
                    $this->explode($baseId, $aircraft[$aircraftId], $fire['pilotId']);
                }
            }
        });
    }

    private function hasDueWork(int $baseId, int $gameSeconds): bool
    {
        foreach ($this->hangar->inspectionsOf($baseId) as $finishGameSecond) {
            if ($finishGameSecond !== null && $finishGameSecond <= $gameSeconds) {
                return true;
            }
        }
        foreach ($this->hangar->repairsOf($baseId) as $finishGameSecond) {
            if ($finishGameSecond <= $gameSeconds) {
                return true;
            }
        }
        foreach ($this->hangar->firesOf($baseId) as $fire) {
            if ($fire['explodesAt'] <= $gameSeconds) {
                return true;
            }
        }

        return false;
    }

    private function explode(int $baseId, Aircraft $aircraft, ?int $pilotId): void
    {
        $pilot = $this->pilotAboard($baseId, $pilotId);
        $pilotKilled = $pilot !== null && $this->random->getInt(1, self::PERCENT) <= self::EXPLOSION_KILL_PERCENT;
        $this->events->record($baseId, [
            'kind' => 'explosion',
            'aircraftName' => $aircraft->model->name,
            'pilotName' => $pilot?->name,
            'pilotKilled' => $pilotKilled,
        ]);
        $this->squadrons->removeAircraft($aircraft->id);
        if ($pilotKilled) {
            $this->squadrons->removePilot($pilot->id);
        }
    }

    private function pilotAboard(int $baseId, ?int $pilotId): ?Pilot
    {
        foreach ($this->squadrons->pilotsOf($baseId) as $pilot) {
            if ($pilot->id === $pilotId) {
                return $pilot;
            }
        }

        return null;
    }
}
