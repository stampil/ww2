<?php

declare(strict_types=1);

namespace Ww2\Base;

use Ww2\Clock\GameClock;
use Ww2\Clock\GameClockStore;
use Ww2\Database\Database;
use Ww2\Mission\MissionStore;
use Ww2\Squadron\PilotGenerator;
use Ww2\Squadron\SquadronStore;

/**
 * The pilots of the base: they rest, which takes game seconds and then lowers fatigue and stress, and new ones can be recruited.
 */
final class Roster
{
    private const REST_SECONDS = 60;
    private const REST_RECOVERY = 40;
    private const RECRUIT_COST = 250;
    private const RECRUIT_RANK = 1;
    public const MAX_PILOTS = 8;

    public function __construct(
        private readonly Database $database,
        private readonly BaseStore $bases,
        private readonly MissionStore $missions,
        private readonly SquadronStore $squadrons,
        private readonly GameClockStore $clocks,
        private readonly PilotGenerator $pilotGenerator,
        private readonly StationingStore $stationings,
    ) {
    }

    /**
     * Ends the rests that are over first, so the gauges are right.
     *
     * @param GameClock $clock the clock of the base, read once for the whole answer
     * @return array{rests: list<array{pilotId: int, remainingSeconds: int}>, recruitment: array{cost: int, maxPilots: int}, fallen: list<array<string, mixed>>}
     */
    public function describe(int $baseId, GameClock $clock): array
    {
        $this->settle($baseId, $clock->gameSeconds);
        $rests = [];
        foreach ($this->squadrons->restsOf($baseId) as $pilotId => $finishGameSecond) {
            $rests[] = ['pilotId' => $pilotId, 'remainingSeconds' => max(0, $finishGameSecond - $clock->gameSeconds)];
        }

        $fallen = [];
        foreach ($this->squadrons->fallenOf($baseId) as $pilot) {
            $fallen[] = $pilot->toArray();
        }

        return ['rests' => $rests, 'recruitment' => ['cost' => self::RECRUIT_COST, 'maxPilots' => self::MAX_PILOTS], 'fallen' => $fallen];
    }

    /**
     * Sends a pilot to rest: out of the missions for a while, then fatigue and stress drop.
     *
     * @throws BaseException when the pilot is not the base's, is flying or resting already, or has no fatigue or stress to lose
     */
    public function rest(int $baseId, int $pilotId): void
    {
        $this->database->transaction(function () use ($baseId, $pilotId): void {
            $this->bases->lockResources($baseId);
            $gameSeconds = $this->clocks->of($baseId)->gameSeconds;
            $pilot = $this->squadrons->pilotsById($baseId)[$pilotId] ?? throw new BaseException(BaseError::UnknownPilot);
            if (isset($this->squadrons->restsOf($baseId)[$pilotId])) {
                throw new BaseException(BaseError::PilotResting);
            }
            foreach ($this->missions->flightsOf($baseId, $gameSeconds) as $flight) {
                foreach ($flight->crews as $crew) {
                    if ($crew['pilotId'] === $pilotId) {
                        throw new BaseException(BaseError::CrewBusy);
                    }
                }
            }
            if ($this->stationings->isPilotAway($pilotId, $gameSeconds)) {
                throw new BaseException(BaseError::CrewBusy);
            }
            if ($pilot->fatigue === 0 && $pilot->stress === 0) {
                throw new BaseException(BaseError::NothingToRest);
            }
            $this->squadrons->startRest($pilotId, $gameSeconds + self::REST_SECONDS);
        });
    }

    /**
     * Hires a new pilot, a sergeant, for supplies, up to the number of pilots the base can house.
     *
     * @throws BaseException when the supplies run short or the base is full
     */
    public function recruit(int $baseId): void
    {
        $this->database->transaction(function () use ($baseId): void {
            $resources = $this->bases->lockResources($baseId);
            if (count($this->squadrons->pilotsOf($baseId)) >= self::MAX_PILOTS) {
                throw new BaseException(BaseError::TooManyPilots);
            }
            if ($resources->supplies < self::RECRUIT_COST) {
                throw new BaseException(BaseError::InsufficientSupplies);
            }
            $this->bases->spendSupplies($baseId, self::RECRUIT_COST);
            $this->squadrons->addPilot($baseId, $this->pilotGenerator->generate(self::RECRUIT_RANK, $this->squadrons->clanOf($baseId)));
        });
    }

    private function settle(int $baseId, int $gameSeconds): void
    {
        $due = [];
        foreach ($this->squadrons->restsOf($baseId) as $pilotId => $finishGameSecond) {
            if ($finishGameSecond <= $gameSeconds) {
                $due[] = $pilotId;
            }
        }
        if ($due === []) {
            return;
        }
        $this->database->transaction(function () use ($baseId, $due): void {
            $this->bases->lockResources($baseId);
            $pilots = $this->squadrons->pilotsById($baseId);
            foreach ($due as $pilotId) {
                $pilot = $pilots[$pilotId];
                $this->squadrons->updatePilotGauges($pilotId, max(0, $pilot->fatigue - self::REST_RECOVERY), max(0, $pilot->stress - self::REST_RECOVERY));
                $this->squadrons->finishRest($pilotId);
            }
        });
    }

}
