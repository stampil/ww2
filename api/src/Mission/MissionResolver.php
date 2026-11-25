<?php

declare(strict_types=1);

namespace Ww2\Mission;

use Random\Randomizer;
use Ww2\Base\SparePart;
use Ww2\Mission\Dogfight\DogfightOutcome;
use Ww2\Squadron\Aircraft;
use Ww2\Squadron\Pilot;

/**
 * Works out the result of a flight: a crew that played its dogfight succeeds if it shot the enemy down; the other crews share one roll, the
 * strength of the crews against the risk of the mission. Then each aircraft takes damage, which destroys modules and may set it on fire, and each pilot tires;
 * an aircraft of a crew that failed may not come back at all.
 * An aircraft that the flak destroys is out of the flight and its pilot is killed half of the time; the flight succeeds if the crews that are left do, and fails when none is.
 * The figures are mine.
 */
final class MissionResolver
{
    private const BASE_CHANCE = 50;
    private const BASE_DIFFICULTY = 15;
    private const DIFFICULTY_PER_RISK = 10;
    private const MIN_CHANCE = 5;
    private const MAX_CHANCE = 95;
    private const PERCENT = 100;
    private const CONDITION_WEIGHT = 0.5;
    private const STRESS_LIMIT = 50;
    private const STRESS_PENALTY_PER_POINT = 0.5;
    private const MAX_DAMAGE_PER_RISK_ON_SUCCESS = 8;
    private const MAX_DAMAGE_PER_RISK_ON_FAILURE = 25;
    private const FATIGUE_PER_MINUTE = 4;
    private const SECONDS_PER_MINUTE = 60;
    private const STRESS_PER_RISK = 4;
    private const STRESS_ON_FAILURE = 10;
    private const STRESS_ON_AIRCRAFT_LOST = 15;
    private const GAUGE_MAX = 100;
    private const DAMAGE_PER_MODULE_HIT = 10;
    private const FIRE_DURABILITY_PERCENT = 25;
    // A hit of the flak takes this much durability, and the second hit destroys the aircraft.
    private const FLAK_HIT_DAMAGE = 25;
    private const FLAK_HITS_TO_DESTROY = 2;
    // The pilot of an aircraft that the flak destroys is killed this often, and bails out the rest of the time.
    private const FLAK_PILOT_DEATH_PERCENT = 50;
    // A failed mission may cost the aircraft altogether: it does not come back.
    private const FAILED_FLIGHT_LOSS_PERCENT = 10;

    public function __construct(private readonly Randomizer $random = new Randomizer())
    {
    }

    /**
     * @param array<int, Pilot> $pilots the pilots of the flight, by id
     * @param array<int, Aircraft> $aircraft the aircraft of the flight, by id
     * @param array<int, DogfightOutcome> $duels how the dogfights of the flight that were played to their end ended, by the id of the aircraft
     * @param array<int, int> $flakHits how many times the flak hit each aircraft of the flight, by the id of the aircraft: one it destroyed is out of the flight
     * @param list<int> $lostInCombat the aircraft that lost a combat of a capture, which are lost whatever else happened to them
     */
    public function resolve(Flight $flight, array $pilots, array $aircraft, array $duels = [], array $flakHits = [], array $lostInCombat = []): MissionReport
    {
        $successes = [];
        $unplayed = [];
        $shotDownAircraftIds = [];
        foreach ($flight->crews as $crew) {
            if ($this->isShotDownByFlak($flakHits[$crew['aircraftId']] ?? 0)) {
                $shotDownAircraftIds[] = $crew['aircraftId'];
                continue;
            }
            if (isset($duels[$crew['aircraftId']])) {
                $successes[$crew['aircraftId']] = $duels[$crew['aircraftId']] === DogfightOutcome::Won;
            } else {
                $unplayed[] = $crew;
            }
        }
        if ($unplayed !== []) {
            $rolled = $this->rolledSuccess($flight, $unplayed, $pilots, $aircraft);
            foreach ($unplayed as $crew) {
                $successes[$crew['aircraftId']] = $rolled;
            }
        }

        $outcomes = [];
        foreach ($flight->crews as $crew) {
            $isShotDown = in_array($crew['aircraftId'], $shotDownAircraftIds, true);
            $outcomes[] = $this->outcomeOf($flight->mission, $pilots[$crew['pilotId']], $aircraft[$crew['aircraftId']], !$isShotDown && $successes[$crew['aircraftId']], $flakHits[$crew['aircraftId']] ?? 0, in_array($crew['aircraftId'], $lostInCombat, true));
        }
        $success = $successes !== [] && !in_array(false, $successes, true);

        return new MissionReport(
            $flight->mission->type,
            $success,
            $flight->windSpeed,
            $flight->mission->risk,
            $flight->mission->durationSeconds,
            $success ? $flight->mission->rewardSupplies : 0,
            $success ? $flight->mission->rewardCommandPoints : 0,
            $outcomes,
        );
    }

    /** Whether that many hits of flak destroy an aircraft. */
    public function isShotDownByFlak(int $flakHits): bool
    {
        return $flakHits >= self::FLAK_HITS_TO_DESTROY;
    }

    /**
     * One roll for the crews that played no mini-game: their average strength against the risk of the mission.
     *
     * @param list<array{pilotId: int, aircraftId: int}> $crews
     * @param array<int, Pilot> $pilots
     * @param array<int, Aircraft> $aircraft
     */
    public function rolledSuccess(Flight $flight, array $crews, array $pilots, array $aircraft): bool
    {
        $totalStrength = 0.0;
        foreach ($crews as $crew) {
            $totalStrength += $this->strengthOf($pilots[$crew['pilotId']], $aircraft[$crew['aircraftId']]);
        }
        $chance = $this->successChance($flight, $totalStrength / count($crews));

        return $this->random->getInt(1, self::PERCENT) <= $chance;
    }

    private function strengthOf(Pilot $pilot, Aircraft $aircraft): float
    {
        $attributes = [$pilot->effectiveAccuracy(), $pilot->effectiveResilience(), $aircraft->model->maneuverability];
        $strength = array_sum($attributes) / count($attributes);
        $condition = $aircraft->durability / $aircraft->model->durability;
        $strength *= 1 - self::CONDITION_WEIGHT * (1 - $condition);

        return $strength - max(0, $pilot->stress - self::STRESS_LIMIT) * self::STRESS_PENALTY_PER_POINT;
    }

    /**
     * @return int the chance of success in percent: the strength against the difficulty, cut by a load under the need
     */
    private function successChance(Flight $flight, float $averageStrength): int
    {
        $mission = $flight->mission;
        $chance = self::BASE_CHANCE + $averageStrength - (self::BASE_DIFFICULTY + self::DIFFICULTY_PER_RISK * $mission->risk);
        $chance *= $this->loadRatio($flight);

        return (int) round(max(self::MIN_CHANCE, min(self::MAX_CHANCE, $chance)));
    }

    private function loadRatio(Flight $flight): float
    {
        $ratios = [1.0];
        if ($flight->mission->fuelPerAircraft > 0) {
            $ratios[] = $flight->fuelLoaded / $flight->mission->fuelPerAircraft;
        }
        if ($flight->mission->ammunitionPerAircraft > 0) {
            $ratios[] = $flight->ammunitionLoaded / $flight->mission->ammunitionPerAircraft;
        }

        return min($ratios);
    }

    /** A pilot whose aircraft the flak destroys is killed by a toss; one whose aircraft is lost some other way is killed unless a roll against their resilience saves them. */
    private function isPilotKilled(bool $shotDownByFlak, bool $aircraftLost, Pilot $pilot): bool
    {
        if ($shotDownByFlak) {
            return $this->random->getInt(1, self::PERCENT) <= self::FLAK_PILOT_DEATH_PERCENT;
        }

        return $aircraftLost && $this->random->getInt(1, self::PERCENT) > $pilot->effectiveResilience();
    }

    private function outcomeOf(Mission $mission, Pilot $pilot, Aircraft $aircraft, bool $success, int $flakHits, bool $lostInCombat): CrewOutcome
    {
        $damagePerRisk = $success ? self::MAX_DAMAGE_PER_RISK_ON_SUCCESS : self::MAX_DAMAGE_PER_RISK_ON_FAILURE;
        $vanished = !$success && $this->random->getInt(1, self::PERCENT) <= self::FAILED_FLIGHT_LOSS_PERCENT;
        $shotDownByFlak = $this->isShotDownByFlak($flakHits);
        $shotDown = $shotDownByFlak || $lostInCombat;
        $durability = $vanished || $shotDown ? 0 : max(0, $aircraft->durability - $this->random->getInt(0, $damagePerRisk * $mission->risk) - $flakHits * self::FLAK_HIT_DAMAGE);
        $aircraftLost = $durability === 0;
        $pilotKilled = $this->isPilotKilled($shotDownByFlak, $aircraftLost, $pilot);
        $hits = min(count(SparePart::cases()), intdiv($aircraft->durability - $durability, self::DAMAGE_PER_MODULE_HIT));
        $destroyedModules = $aircraftLost ? [] : array_slice($this->random->shuffleArray(SparePart::cases()), 0, $hits);
        $burning = !$aircraftLost && $durability * self::PERCENT <= $aircraft->model->durability * self::FIRE_DURABILITY_PERCENT;

        $fatigue = $pilot->fatigue + intdiv($mission->durationSeconds, self::SECONDS_PER_MINUTE) * self::FATIGUE_PER_MINUTE;
        $stress = $pilot->stress + self::STRESS_PER_RISK * $mission->risk;
        if (!$success) {
            $stress += self::STRESS_ON_FAILURE;
        }
        if ($aircraftLost) {
            $stress += self::STRESS_ON_AIRCRAFT_LOST;
        }

        return new CrewOutcome(
            $pilot->id,
            $aircraft->id,
            $pilot->name,
            $aircraft->model->name,
            $success,
            $aircraft->durability - $durability,
            $durability,
            $destroyedModules,
            $burning,
            $aircraftLost,
            $pilotKilled,
            $shotDownByFlak,
            min(self::GAUGE_MAX, $fatigue),
            min(self::GAUGE_MAX, $stress),
        );
    }
}
