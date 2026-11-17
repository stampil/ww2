<?php

declare(strict_types=1);

namespace Ww2\Mission;

use Random\Randomizer;
use Ww2\Base\SparePart;
use Ww2\Squadron\Aircraft;
use Ww2\Squadron\Pilot;

/**
 * Works out the result of a flight without a mini-game: the strength of the crews against the risk of the mission decides
 * whether it succeeds, then each aircraft takes damage, which destroys modules and may set it on fire, and each pilot tires. The figures are mine.
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
    private const BOMBING_WIND_PENALTY_PER_KPH = 0.5;
    private const MAX_DAMAGE_PER_RISK_ON_SUCCESS = 8;
    private const MAX_DAMAGE_PER_RISK_ON_FAILURE = 25;
    private const FATIGUE_PER_MINUTE = 4;
    private const SECONDS_PER_MINUTE = 60;
    private const STRESS_PER_RISK = 4;
    private const STRESS_ON_FAILURE = 10;
    private const STRESS_ON_AIRCRAFT_LOST = 15;
    private const GAUGE_MAX = 100;
    private const DAMAGE_PER_MODULE_HIT = 8;
    private const FIRE_DURABILITY_PERCENT = 25;

    public function __construct(private readonly Randomizer $random = new Randomizer())
    {
    }

    /**
     * @param array<int, Pilot> $pilots the pilots of the flight, by id
     * @param array<int, Aircraft> $aircraft the aircraft of the flight, by id
     */
    public function resolve(Flight $flight, array $pilots, array $aircraft): MissionReport
    {
        $totalStrength = 0.0;
        foreach ($flight->crews as $crew) {
            $totalStrength += $this->strengthOf($pilots[$crew['pilotId']], $aircraft[$crew['aircraftId']]);
        }
        $chance = $this->successChance($flight, $totalStrength / count($flight->crews));
        $success = $this->random->getInt(1, self::PERCENT) <= $chance;

        $outcomes = [];
        foreach ($flight->crews as $crew) {
            $outcomes[] = $this->outcomeOf($flight->mission, $pilots[$crew['pilotId']], $aircraft[$crew['aircraftId']], $success);
        }

        return new MissionReport(
            $flight->mission->type,
            $success,
            $flight->windSpeed,
            $success ? $flight->mission->rewardSupplies : 0,
            $success ? $flight->mission->rewardCommandPoints : 0,
            $outcomes,
        );
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
     * @return int the chance of success in percent: the strength against the difficulty, less a strong wind for a bombing, cut by a load under the need
     */
    private function successChance(Flight $flight, float $averageStrength): int
    {
        $mission = $flight->mission;
        $chance = self::BASE_CHANCE + $averageStrength - (self::BASE_DIFFICULTY + self::DIFFICULTY_PER_RISK * $mission->risk);
        if ($mission->type === MissionType::Bombing) {
            $chance -= $flight->windSpeed * self::BOMBING_WIND_PENALTY_PER_KPH;
        }
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

    private function outcomeOf(Mission $mission, Pilot $pilot, Aircraft $aircraft, bool $success): CrewOutcome
    {
        $damagePerRisk = $success ? self::MAX_DAMAGE_PER_RISK_ON_SUCCESS : self::MAX_DAMAGE_PER_RISK_ON_FAILURE;
        $durability = max(0, $aircraft->durability - $this->random->getInt(0, $damagePerRisk * $mission->risk));
        $aircraftLost = $durability === 0;
        $pilotKilled = $aircraftLost && $this->random->getInt(1, self::PERCENT) > $pilot->effectiveResilience();
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
            $aircraft->durability - $durability,
            $durability,
            $destroyedModules,
            $burning,
            $aircraftLost,
            $pilotKilled,
            min(self::GAUGE_MAX, $fatigue),
            min(self::GAUGE_MAX, $stress),
        );
    }
}
