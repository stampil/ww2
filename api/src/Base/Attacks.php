<?php

declare(strict_types=1);

namespace Ww2\Base;

use Random\Randomizer;
use Ww2\Clock\GameClockStore;
use Ww2\Mission\Flight;
use Ww2\Mission\Mission;
use Ww2\Mission\MissionGenerator;
use Ww2\Mission\MissionReport;
use Ww2\Mission\MissionType;
use Ww2\Squadron\SquadronStore;
use Ww2\World\Bases;

/**
 * Raids and captures against the camps of players of the other side: which camps can be attacked, what an attack is, and what it does to the camp when its squadron is received.
 * A raid wears the defense of the camp down and destroys a building and sometimes an aircraft; a capture, once the defense is down, takes the camp. The figures are mine.
 */
final class Attacks
{
    /** A player who has just taken their first camp cannot be attacked for this long. */
    private const PROTECTION_SECONDS = 1800;
    /** What an absent player's camp suffers at most, in raids that hurt it, in an hour. */
    private const MAX_RAIDS_PER_HOUR = 3;
    private const SECONDS_PER_HOUR = 3600;
    private const DEFENSE_DAMAGE_PER_AIRCRAFT = 30;
    private const DEFENSE_PER_DEFENDING_AIRCRAFT = 10;
    private const AIRCRAFT_DESTROYED_PERCENT = 50;
    private const PERCENT = 100;
    /** The defense of a camp that has just been taken. */
    private const CAPTURED_DEFENSE = 50;
    private const BACK_AND_FORTH = 2;

    public function __construct(
        private readonly Bases $bases,
        private readonly CampStore $camps,
        private readonly Garrison $garrison,
        private readonly Holdings $holdings,
        private readonly PlayerActivity $activity,
        private readonly Stationings $stationings,
        private readonly MissionGenerator $generator,
        private readonly SquadronStore $squadrons,
        private readonly EventLog $events,
        private readonly GameClockStore $clocks,
        private readonly Randomizer $random = new Randomizer(),
    ) {
    }

    /**
     * @return list<array{baseId: int, site: string, holder: string, defense: int, flightSeconds: int, raidRefusal: string|null, captureRefusal: string|null}> the camps of players of the other side in the world, with what refuses an attack on each
     */
    public function targetsOf(int $baseId, int $gameSeconds): array
    {
        $targets = [];
        foreach ($this->bases->campsOf($this->bases->instanceOf($baseId)) as $camp) {
            if ($this->refusalOf($baseId, $camp['id'], MissionType::Raid, $gameSeconds) === BaseError::InvalidTarget) {
                continue;
            }
            $targets[] = [
                'baseId' => $camp['id'],
                'site' => $this->bases->siteOf($camp['id'])->value,
                'holder' => $this->bases->holderNameOf($camp['id']),
                'defense' => $this->camps->defenseOf($camp['id'], $gameSeconds),
                'flightSeconds' => $this->stationings->flightSecondsBetween($baseId, $camp['id']),
                'raidRefusal' => $this->refusalOf($baseId, $camp['id'], MissionType::Raid, $gameSeconds)?->value,
                'captureRefusal' => $this->refusalOf($baseId, $camp['id'], MissionType::CampCapture, $gameSeconds)?->value,
            ];
        }

        return $targets;
    }

    /**
     * @throws BaseException when the camp cannot be attacked this way now
     */
    public function assertTarget(int $baseId, int $targetBaseId, MissionType $type, int $gameSeconds): void
    {
        $refusal = $this->refusalOf($baseId, $targetBaseId, $type, $gameSeconds);
        if ($refusal !== null) {
            throw new BaseException($refusal);
        }
    }

    /**
     * The mission of an attack on a camp: the flight there and back for a raid, there only for a capture, whose aircraft stays.
     */
    public function missionFor(int $baseId, int $targetBaseId, MissionType $type, int $aircraftCount): Mission
    {
        $drawn = $this->generator->draw([$type]);
        $flightSeconds = $this->stationings->flightSecondsBetween($baseId, $targetBaseId);
        $durationSeconds = $type === MissionType::Raid ? self::BACK_AND_FORTH * $flightSeconds : $flightSeconds;

        return new Mission(0, $type, $aircraftCount, $durationSeconds, $drawn->fuelPerAircraft, $drawn->ammunitionPerAircraft, $drawn->risk, 0, $type->profile()->commandPointsPerAircraft * $aircraftCount);
    }

    /**
     * What an attack did, once its squadron is back: nothing if it failed or the camp can no longer be attacked, else the damage of a raid or the new holder of a captured camp.
     * The caller holds the transaction.
     *
     * @return array<string, mixed>|null null for a mission that is not an attack
     */
    public function resolve(int $baseId, Flight $flight, MissionReport $report, int $gameSeconds): ?array
    {
        if ($flight->targetBaseId === null) {
            return null;
        }
        $type = $flight->mission->type;
        if (!$report->success) {
            return ['result' => 'repelled'];
        }
        $refusal = $this->refusalOf($baseId, $flight->targetBaseId, $type, $gameSeconds);
        if ($refusal !== null) {
            return ['result' => 'calledOff', 'reason' => $refusal->value];
        }

        return $type === MissionType::Raid
            ? $this->raid($flight->targetBaseId, count($report->crews), $baseId, $gameSeconds)
            : $this->capture($baseId, $flight->targetBaseId, $report, $gameSeconds);
    }

    private function refusalOf(int $baseId, int $targetBaseId, MissionType $type, int $gameSeconds): ?BaseError
    {
        $attackerId = $this->bases->holderIdOf($baseId);
        $holderId = $this->bases->holderIdOf($targetBaseId);
        if ($holderId === null || $this->bases->instanceOf($targetBaseId) !== $this->bases->instanceOf($baseId) || $this->bases->clanOfPlayer($holderId) === $this->bases->clanOfPlayer($attackerId)) {
            return BaseError::InvalidTarget;
        }
        $sinceFirstClaim = $this->bases->secondsSinceFirstClaim($holderId);
        if ($sinceFirstClaim !== null && $sinceFirstClaim < self::PROTECTION_SECONDS) {
            return BaseError::CampProtected;
        }
        if ($type === MissionType::Raid) {
            $isSpared = $this->activity->isAbsent($holderId) && $this->camps->raidsSince($targetBaseId, $gameSeconds - self::SECONDS_PER_HOUR) >= self::MAX_RAIDS_PER_HOUR;

            return $isSpared ? BaseError::CampSpared : null;
        }
        if ($this->camps->defenseOf($targetBaseId, $gameSeconds) > 0) {
            return BaseError::DefenseHolds;
        }
        if (count($this->bases->idsOf($holderId)) === 1) {
            return BaseError::LastBase;
        }

        return count($this->bases->idsOf($attackerId)) >= Bases::MAX_PER_PLAYER ? BaseError::TooManyBases : null;
    }

    /**
     * @return array<string, mixed>
     */
    private function raid(int $campId, int $attackingAircraft, int $attackerBaseId, int $gameSeconds): array
    {
        $defendingAircraft = count($this->garrison->onGround($campId, $gameSeconds));
        $damage = max(0, self::DEFENSE_DAMAGE_PER_AIRCRAFT * $attackingAircraft - self::DEFENSE_PER_DEFENDING_AIRCRAFT * $defendingAircraft);
        $before = $this->camps->defenseOf($campId, $gameSeconds);
        $this->camps->setDefense($campId, max(0, $before - $damage), $gameSeconds);
        $this->camps->recordRaid($campId, $gameSeconds);
        $building = $this->destroyBuilding($campId);
        $aircraftLost = $this->destroyAircraft($campId, $gameSeconds);
        $effect = [
            'result' => 'raided',
            'defenseLost' => $before - $this->camps->defenseOf($campId, $gameSeconds),
            'building' => $building?->value,
            'aircraftLost' => $aircraftLost,
        ];
        $this->tell($campId, ['kind' => 'raided', 'site' => $this->bases->siteOf($campId)->value, 'by' => $this->bases->holderNameOf($attackerBaseId)] + $effect);

        return $effect;
    }

    /**
     * @return array<string, mixed>
     */
    private function capture(int $attackerBaseId, int $campId, MissionReport $report, int $gameSeconds): array
    {
        $crew = $report->crews[0];
        if ($crew->aircraftLost || $crew->pilotKilled) {
            return ['result' => 'noLanding'];
        }
        $landing = new Stationing($crew->aircraftId, $crew->pilotId, $attackerBaseId, $campId, new Cargo(0, 0, 0, 0), $gameSeconds, null);
        $this->holdings->seize($campId, $this->bases->holderIdOf($attackerBaseId), $landing, $gameSeconds);
        $this->camps->setDefense($campId, self::CAPTURED_DEFENSE, $gameSeconds);

        return ['result' => 'captured'];
    }

    private function destroyBuilding(int $campId): ?Building
    {
        $standing = array_values(array_filter(Building::cases(), fn (Building $building): bool => !in_array($building, $this->camps->destroyedOf($campId), true)));
        if ($standing === []) {
            return null;
        }
        $building = $standing[$this->random->getInt(0, count($standing) - 1)];
        $this->camps->destroy($campId, $building);

        return $building;
    }

    /**
     * @return bool whether an aircraft on the ground at the camp was destroyed
     */
    private function destroyAircraft(int $campId, int $gameSeconds): bool
    {
        $aircraftIds = $this->garrison->onGround($campId, $gameSeconds);
        if ($aircraftIds === [] || $this->random->getInt(1, self::PERCENT) > self::AIRCRAFT_DESTROYED_PERCENT) {
            return false;
        }
        $this->squadrons->destroyAircraft($aircraftIds[$this->random->getInt(0, count($aircraftIds) - 1)]);

        return true;
    }

    /**
     * Writes what happened to the journal of the camp, and of the first base of its holder when the player looks at another one.
     *
     * @param array<string, mixed> $details
     */
    private function tell(int $campId, array $details): void
    {
        $journalIds = [$campId];
        $firstId = $this->bases->idOf($this->bases->holderIdOf($campId));
        if ($firstId !== null && $firstId !== $campId) {
            $journalIds[] = $firstId;
        }
        foreach ($journalIds as $journalId) {
            $this->events->record($journalId, $details);
        }
    }
}
