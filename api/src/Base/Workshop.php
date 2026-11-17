<?php

declare(strict_types=1);

namespace Ww2\Base;

use Ww2\Clock\GameClock;
use Ww2\Clock\GameClockStore;
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
    ) {
    }

    /**
     * @throws BaseException when the materials run short, every bench is busy, or no mechanic is free
     */
    public function start(int $playerId, SparePart $part, bool $withMechanic): void
    {
        $this->database->transaction(function () use ($playerId, $part, $withMechanic): void {
            $resources = $this->bases->lockResources($playerId);
            $gameSeconds = $this->clocks->of($playerId)->gameSeconds;
            $running = $this->bases->runningJobs($playerId, $gameSeconds);
            if (count($running) >= $this->benchesOf($playerId)) {
                throw new BaseException(BaseError::WorkshopBusy);
            }
            if ($withMechanic && $this->mechanics->freeAt($playerId, $gameSeconds) < 1) {
                throw new BaseException(BaseError::NoMechanicFree);
            }
            if ($resources->materials < $part->materialCost()) {
                throw new BaseException(BaseError::InsufficientMaterials);
            }
            $this->bases->spendMaterials($playerId, $part->materialCost());
            $seconds = $withMechanic ? intdiv($part->seconds(), self::MECHANIC_TIME_DIVISOR) : $part->seconds();
            $this->bases->addJob($playerId, $part, $gameSeconds + $seconds, $withMechanic);
        });
    }

    /**
     * @param GameClock $clock the clock of the player, read once for the whole answer
     * @return array{benches: int, freeMechanics: int, parts: list<array{part: string, materialCost: int, seconds: int}>, jobs: list<array<string, int|string|bool>>, readyParts: array<string, int>}
     */
    public function describe(int $playerId, GameClock $clock): array
    {
        $running = $this->bases->runningJobs($playerId, $clock->gameSeconds);
        $parts = [];
        foreach (SparePart::cases() as $part) {
            $parts[] = ['part' => $part->value, 'materialCost' => $part->materialCost(), 'seconds' => $part->seconds()];
        }

        return [
            'benches' => $this->benchesOf($playerId),
            'freeMechanics' => $this->mechanics->freeAt($playerId, $clock->gameSeconds),
            'parts' => $parts,
            'jobs' => array_map(static fn (ProductionJob $job): array => $job->toArray(), $running),
            'readyParts' => $this->bases->readyParts($playerId, $clock->gameSeconds),
        ];
    }

    private function benchesOf(int $playerId): int
    {
        return self::BASE_BENCHES + $this->upgrades->levelOf($playerId, Upgrade::Workshop);
    }
}
