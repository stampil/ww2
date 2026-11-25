<?php

declare(strict_types=1);

namespace Ww2\Base;

use Ww2\Mission\Dogfight\DogfightOutcome;
use Ww2\Mission\Flight;
use Ww2\Mission\MissionResolver;
use Ww2\Squadron\Aircraft;
use Ww2\Squadron\Pilot;

/**
 * Works out how the combats of a capture went: one for each defender the camp had when the squadron left, flown by the aircraft in turn; a lost one loses its aircraft.
 * A combat that was not played is rolled, as the strength of its crew against the risk of the mission.
 */
final class CaptureCombats
{
    public function __construct(private readonly MissionResolver $resolver)
    {
    }

    /**
     * @param array<int, Pilot> $pilots the pilots of the flight, by id
     * @param array<int, Aircraft> $aircraft the aircraft of the flight, by id
     * @param list<array{aircraftId: int, outcome: DogfightOutcome|null}> $combats the combats in the order they come, each with its aircraft and how it ended, null if it was not played
     * @param array<int, int> $flakHits how many times the flak hit each aircraft, by id: one it destroyed flies no combat
     */
    public function fight(Flight $flight, array $pilots, array $aircraft, array $combats, array $flakHits): CaptureFight
    {
        $pilotIds = [];
        foreach ($flight->crews as $crew) {
            $pilotIds[$crew['aircraftId']] = $crew['pilotId'];
        }
        $kills = 0;
        $lostAircraftIds = [];
        foreach ($flight->crews as $crew) {
            if ($this->resolver->isShotDownByFlak($flakHits[$crew['aircraftId']] ?? 0)) {
                $lostAircraftIds[] = $crew['aircraftId'];
            }
        }
        foreach ($combats as $combat) {
            $aircraftId = $combat['aircraftId'];
            if (in_array($aircraftId, $lostAircraftIds, true)) {
                continue;
            }
            $outcome = $combat['outcome'] ?? $this->rolledOutcome($flight, $pilots[$pilotIds[$aircraftId]], $aircraft[$aircraftId]);
            if ($outcome === DogfightOutcome::Won) {
                $kills += 1;
            } else {
                $lostAircraftIds[] = $aircraftId;
            }
        }

        return new CaptureFight(count($combats), $kills, $lostAircraftIds);
    }

    private function rolledOutcome(Flight $flight, Pilot $pilot, Aircraft $aircraft): DogfightOutcome
    {
        $crew = [['pilotId' => $pilot->id, 'aircraftId' => $aircraft->id]];

        return $this->resolver->rolledSuccess($flight, $crew, [$pilot->id => $pilot], [$aircraft->id => $aircraft]) ? DogfightOutcome::Won : DogfightOutcome::Escaped;
    }
}
