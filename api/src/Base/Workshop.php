<?php

declare(strict_types=1);

namespace Ww2\Base;

use Ww2\Clock\GameClock;
use Ww2\Clock\GameClockStore;
use Ww2\Squadron\SquadronFounder;
use Ww2\Squadron\SquadronStore;
use Ww2\Database\Database;

/**
 * The workshop: a few benches, which the upgrades add to, that make spare parts for the aircraft, helped by mechanics who halve the time.
 * Its times run on the game clock.
 */
final class Workshop
{
    private const BASE_BENCHES = 2;
    private const MECHANIC_TIME_DIVISOR = 2;

    public function __construct(
        private readonly Database $database,
        private readonly BaseStore $bases,
        private readonly GameClockStore $clocks,
        private readonly Mechanics $mechanics,
        private readonly Upgrades $upgrades,
        private readonly CampStore $camps,
        private readonly SquadronStore $squadrons,
        private readonly SquadronFounder $squadronFounder,
    ) {
    }

    /**
     * Builds a new aircraft out of the four parts the workshop has made, one of each, to replace one that was lost.
     *
     * @throws BaseException when the workshop is destroyed, the hangar is full, or a part is missing
     */
    public function assembleAircraft(int $baseId): void
    {
        $this->database->transaction(function () use ($baseId): void {
            $this->bases->lockResources($baseId);
            $this->camps->assertStanding($baseId, Building::Workshop);
            if (count($this->squadrons->aircraftOf($baseId)) >= Hangar::PLACES) {
                throw new BaseException(BaseError::HangarFull);
            }
            $gameSeconds = $this->clocks->of($baseId)->gameSeconds;
            foreach (SparePart::cases() as $part) {
                if (!$this->bases->useReadyPart($baseId, $part, $gameSeconds)) {
                    throw new BaseException(BaseError::MissingSparePart);
                }
            }
            $this->squadronFounder->addStartingAircraft($baseId);
        });
    }

    /**
     * @throws BaseException when the workshop is destroyed, the materials run short, every bench is busy, or no mechanic is free
     */
    public function start(int $baseId, SparePart $part, bool $withMechanic): void
    {
        $this->database->transaction(function () use ($baseId, $part, $withMechanic): void {
            $resources = $this->bases->lockResources($baseId);
            $this->camps->assertStanding($baseId, Building::Workshop);
            $gameSeconds = $this->clocks->of($baseId)->gameSeconds;
            $running = $this->bases->runningJobs($baseId, $gameSeconds);
            if (count($running) >= $this->benchesOf($baseId)) {
                throw new BaseException(BaseError::WorkshopBusy);
            }
            if ($withMechanic && $this->mechanics->freeAt($baseId, $gameSeconds) < 1) {
                throw new BaseException(BaseError::NoMechanicFree);
            }
            if ($resources->materials < $part->materialCost()) {
                throw new BaseException(BaseError::InsufficientMaterials);
            }
            $this->bases->spendMaterials($baseId, $part->materialCost());
            $seconds = $withMechanic ? intdiv($part->seconds(), self::MECHANIC_TIME_DIVISOR) : $part->seconds();
            $this->bases->addJob($baseId, $part, $gameSeconds + $seconds, $withMechanic);
        });
    }

    /**
     * @param GameClock $clock the clock of the base, read once for the whole answer
     * @return array{benches: int, freeMechanics: int, parts: list<array{part: string, materialCost: int, seconds: int}>, jobs: list<array<string, int|string|bool>>, readyParts: array<string, int>}
     */
    public function describe(int $baseId, GameClock $clock): array
    {
        $running = $this->bases->runningJobs($baseId, $clock->gameSeconds);
        $parts = [];
        foreach (SparePart::cases() as $part) {
            $parts[] = ['part' => $part->value, 'materialCost' => $part->materialCost(), 'seconds' => $part->seconds()];
        }

        return [
            'benches' => $this->benchesOf($baseId),
            'freeMechanics' => $this->mechanics->freeAt($baseId, $clock->gameSeconds),
            'parts' => $parts,
            'jobs' => array_map(static fn (ProductionJob $job): array => $job->toArray(), $running),
            'readyParts' => $this->bases->readyParts($baseId, $clock->gameSeconds),
        ];
    }

    private function benchesOf(int $baseId): int
    {
        return self::BASE_BENCHES + $this->upgrades->levelOf($baseId, Upgrade::Workshop);
    }
}
