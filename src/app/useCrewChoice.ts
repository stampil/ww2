import { useState } from 'react'
import type { BusyCrews } from './flights'
import type { Aircraft, Pilot, Squadron } from './useBase'

export type CrewChoice = {
  freeAircraft: Aircraft[]
  freePilots: Pilot[]
  /** The aircraft and the pilot chosen, the first free of each until the player picks another; none when nobody is free. */
  aircraft: Aircraft | undefined
  pilot: Pilot | undefined
  setAircraftId: (aircraftId: number) => void
  setPilotId: (pilotId: number) => void
}

/** The aircraft and the pilot of a flight, chosen among those that are not busy. */
export function useCrewChoice(squadron: Squadron, unavailable: BusyCrews): CrewChoice {
  const freeAircraft = squadron.aircraft.filter((aircraft) => !unavailable.aircraftIds.includes(aircraft.id))
  const freePilots = squadron.pilots.filter((pilot) => !unavailable.pilotIds.includes(pilot.id))
  const [aircraftId, setAircraftId] = useState<number | null>(null)
  const [pilotId, setPilotId] = useState<number | null>(null)

  return {
    freeAircraft,
    freePilots,
    aircraft: freeAircraft.find((candidate) => candidate.id === aircraftId) ?? freeAircraft[0],
    pilot: freePilots.find((candidate) => candidate.id === pilotId) ?? freePilots[0],
    setAircraftId,
    setPilotId,
  }
}
