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
    /** One air combat mission in this many is an ace mission. */
    private const ACE_ONE_IN = 8;

    case Reconnaissance = 'reconnaissance';
    case AirCombat = 'airCombat';
    case FighterCombat = 'fighterCombat';
    case GroundAttack = 'groundAttack';
    case Raid = 'raid';
    case CampCapture = 'campCapture';

    /**
     * @param list<AircraftCategory> $categories the categories of the aircraft a squadron has
     */
    public function isFlyableBy(array $categories): bool
    {
        $required = $this->profile()->category;

        return $required === null || in_array($required, $categories, true);
    }

    /** Whether the mission is sent against an enemy camp, which the player picks on the map, instead of being drawn on the table of the headquarters. */
    public function isAttack(): bool
    {
        return $this === self::Raid || $this === self::CampCapture;
    }

    /** Whether the aircraft of the squadron strike the ground on this mission: a ground attack, a raid on a camp or its capture. */
    public function isGroundStrike(): bool
    {
        return $this === self::GroundAttack || $this === self::Raid || $this === self::CampCapture;
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
            self::AirCombat => $this->fighterProfile(new IntegerRange(2, 2), self::ACE_ONE_IN),
            self::GroundAttack => $this->fighterProfile(new IntegerRange(2, 3)),
            self::FighterCombat => $this->fighterProfile(new IntegerRange(1, 2), self::ACE_ONE_IN),
            self::Raid => $this->attackProfile(new IntegerRange(1, 3), new IntegerRange(2, 3), new IntegerRange(60, 60), new IntegerRange(40, 40), 2),
            self::CampCapture => $this->attackProfile(new IntegerRange(1, 1), new IntegerRange(3, 3), new IntegerRange(60, 60), new IntegerRange(30, 30), 4),
        };
    }

    /** The profile of a mission against a camp: its length is the flight there, which the camp sets, and the camp pays nothing in supplies, only in command points. */
    private function attackProfile(IntegerRange $aircraftCount, IntegerRange $risk, IntegerRange $fuel, IntegerRange $ammunition, int $commandPoints): MissionProfile
    {
        return new MissionProfile(
            category: AircraftCategory::Fighter,
            aircraftCount: $aircraftCount,
            durationSeconds: new IntegerRange(0, 0),
            fuelPerAircraft: $fuel,
            ammunitionPerAircraft: $ammunition,
            risk: $risk,
            suppliesPerRiskPoint: new IntegerRange(0, 0),
            commandPointsPerAircraft: $commandPoints,
        );
    }

    /** The profile of a mission flown by fighters, which differs from one type to another by its risk and its ace missions. */
    private function fighterProfile(IntegerRange $risk, ?int $aceOneIn = null): MissionProfile
    {
        return new MissionProfile(
            category: AircraftCategory::Fighter,
            aircraftCount: new IntegerRange(1, 2),
            durationSeconds: new IntegerRange(120, 240),
            fuelPerAircraft: new IntegerRange(40, 60),
            ammunitionPerAircraft: new IntegerRange(20, 40),
            risk: $risk,
            suppliesPerRiskPoint: new IntegerRange(125, 170),
            commandPointsPerAircraft: 2,
            aceOneIn: $aceOneIn,
        );
    }
}
