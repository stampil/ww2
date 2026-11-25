<?php

declare(strict_types=1);

namespace Ww2\Base;

use Random\Randomizer;
use Ww2\Clock\GameClock;
use Ww2\Clock\GameClockStore;
use Ww2\Squadron\Mechanic;
use Ww2\Squadron\SquadronStore;
use Ww2\Database\Database;

/**
 * The workshop: a few benches, which the upgrades add to, that make spare parts for the aircraft, helped by mechanics who halve the time, and where mechanics are recruited.
 * Its times run on the game clock.
 */
final class Workshop
{
    private const BASE_BENCHES = 2;
    private const MECHANIC_TIME_DIVISOR = 2;
    private const MECHANIC_COST = 300;
    public const MAX_MECHANICS = 6;
    private const MIN_MECHANIC_SKILL = 20;
    private const MAX_MECHANIC_SKILL = 60;

    public function __construct(
        private readonly Database $database,
        private readonly BaseStore $bases,
        private readonly GameClockStore $clocks,
        private readonly Mechanics $mechanics,
        private readonly Upgrades $upgrades,
        private readonly CampStore $camps,
        private readonly SquadronStore $squadrons,
        private readonly Randomizer $random = new Randomizer(),
    ) {
    }

    /**
     * Hires a mechanic, whose skill is drawn, for supplies, up to the number of mechanics the base can house.
     *
     * @throws BaseException when the supplies run short or the base has all the mechanics it can house
     */
    public function recruitMechanic(int $baseId): void
    {
        $this->database->transaction(function () use ($baseId): void {
            $resources = $this->bases->lockResources($baseId);
            if (count($this->squadrons->mechanicsOf($baseId)) >= self::MAX_MECHANICS) {
                throw new BaseException(BaseError::TooManyMechanics);
            }
            if ($resources->supplies < self::MECHANIC_COST) {
                throw new BaseException(BaseError::InsufficientSupplies);
            }
            $this->bases->spendSupplies($baseId, self::MECHANIC_COST);
            $this->squadrons->addMechanic($baseId, $this->random->getInt(self::MIN_MECHANIC_SKILL, self::MAX_MECHANIC_SKILL));
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
     * @return array{benches: int, freeMechanics: int, mechanics: list<array{id: int, skill: int}>, mechanicRecruitment: array{cost: int, max: int}, parts: list<array{part: string, materialCost: int, seconds: int}>, jobs: list<array<string, int|string|bool>>, readyParts: array<string, int>}
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
            'mechanics' => array_map(static fn (Mechanic $mechanic): array => $mechanic->toArray(), $this->squadrons->mechanicsOf($baseId)),
            'mechanicRecruitment' => ['cost' => self::MECHANIC_COST, 'max' => self::MAX_MECHANICS],
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
