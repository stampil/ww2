<?php

declare(strict_types=1);

namespace Ww2\Base;

use Ww2\Database\Database;

/**
 * The workshop: a few benches that make spare parts for the aircraft, helped by mechanics who halve the time.
 */
final class Workshop
{
    private const BENCHES = 2;
    private const MECHANICS = 2;
    private const MECHANIC_TIME_DIVISOR = 2;

    public function __construct(private readonly Database $database, private readonly BaseStore $bases)
    {
    }

    /**
     * @throws BaseException when the materials run short, every bench is busy, or no mechanic is free
     */
    public function start(int $playerId, SparePart $part, bool $withMechanic): void
    {
        $this->database->transaction(function () use ($playerId, $part, $withMechanic): void {
            $resources = $this->bases->lockResources($playerId);
            $running = $this->bases->runningJobs($playerId);
            if (count($running) >= self::BENCHES) {
                throw new BaseException(BaseError::WorkshopBusy);
            }
            if ($withMechanic && $this->busyMechanics($running) >= self::MECHANICS) {
                throw new BaseException(BaseError::NoMechanicFree);
            }
            if ($resources->materials < $part->materialCost()) {
                throw new BaseException(BaseError::InsufficientMaterials);
            }
            $this->bases->spendMaterials($playerId, $part->materialCost());
            $seconds = $withMechanic ? intdiv($part->seconds(), self::MECHANIC_TIME_DIVISOR) : $part->seconds();
            $this->bases->addJob($playerId, $part, $seconds, $withMechanic);
        });
    }

    /**
     * @return array{benches: int, freeMechanics: int, parts: list<array{part: string, materialCost: int, seconds: int}>, jobs: list<array<string, int|string|bool>>, readyParts: array<string, int>}
     */
    public function describe(int $playerId): array
    {
        $running = $this->bases->runningJobs($playerId);
        $parts = [];
        foreach (SparePart::cases() as $part) {
            $parts[] = ['part' => $part->value, 'materialCost' => $part->materialCost(), 'seconds' => $part->seconds()];
        }

        return [
            'benches' => self::BENCHES,
            'freeMechanics' => self::MECHANICS - $this->busyMechanics($running),
            'parts' => $parts,
            'jobs' => array_map(static fn (ProductionJob $job): array => $job->toArray(), $running),
            'readyParts' => $this->bases->readyParts($playerId),
        ];
    }

    /**
     * @param list<ProductionJob> $running
     */
    private function busyMechanics(array $running): int
    {
        $busy = 0;
        foreach ($running as $job) {
            if ($job->hasMechanic) {
                $busy += 1;
            }
        }

        return $busy;
    }
}
