<?php

declare(strict_types=1);

namespace Ww2\Mission;

use Ww2\Squadron\AircraftCategory;

/**
 * The kinds of mission the headquarters offers; the value is the name of the type for the front.
 * The figures are mine: the original game does not publish its own.
 */
enum MissionType: string
{
    case Reconnaissance = 'reconnaissance';
    case AirCombat = 'airCombat';
    case FighterCombat = 'fighterCombat';
    case GroundAttack = 'groundAttack';
    case Bombing = 'bombing';

    /**
     * @param list<AircraftCategory> $categories the categories of the aircraft a squadron has
     */
    public function isFlyableBy(array $categories): bool
    {
        $required = $this->profile()->category;

        return $required === null || in_array($required, $categories, true);
    }

    /** Whether the aircraft of the squadron fight enemy aircraft on this mission, which count among those the battle asks for. */
    public function isAirCombat(): bool
    {
        return $this === self::AirCombat || $this === self::FighterCombat;
    }

    public function profile(): MissionProfile
    {
        return match ($this) {
            self::Reconnaissance => new MissionProfile(
                category: null,
                aircraftCount: new IntegerRange(1, 1),
                durationSeconds: new IntegerRange(90, 150),
                fuelPerAircraft: new IntegerRange(30, 50),
                ammunitionPerAircraft: new IntegerRange(0, 0),
                risk: new IntegerRange(1, 2),
                suppliesPerRiskPoint: new IntegerRange(85, 120),
                commandPointsPerAircraft: 1,
            ),
            self::AirCombat, self::FighterCombat, self::GroundAttack => new MissionProfile(
                category: AircraftCategory::Fighter,
                aircraftCount: new IntegerRange(1, 2),
                durationSeconds: new IntegerRange(120, 240),
                fuelPerAircraft: new IntegerRange(40, 60),
                ammunitionPerAircraft: new IntegerRange(20, 40),
                risk: new IntegerRange(2, 3),
                suppliesPerRiskPoint: new IntegerRange(125, 170),
                commandPointsPerAircraft: 2,
            ),
            self::Bombing => new MissionProfile(
                category: AircraftCategory::Bomber,
                aircraftCount: new IntegerRange(1, 2),
                durationSeconds: new IntegerRange(180, 300),
                fuelPerAircraft: new IntegerRange(50, 70),
                ammunitionPerAircraft: new IntegerRange(30, 50),
                risk: new IntegerRange(2, 3),
                suppliesPerRiskPoint: new IntegerRange(160, 215),
                commandPointsPerAircraft: 3,
            ),
        };
    }
}
