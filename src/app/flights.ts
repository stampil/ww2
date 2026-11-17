import type { Flight, HangarAircraft, Rest } from './useBase'

/** The pilots and the aircraft that cannot go on a mission now. */
export type BusyCrews = { pilotIds: number[]; aircraftIds: number[] }

/** The pilots and the aircraft that are on a flight. */
export function busyCrews(flights: Flight[]): BusyCrews {
  const busy: BusyCrews = { pilotIds: [], aircraftIds: [] }
  for (const flight of flights) {
    for (const crew of flight.crews) {
      busy.pilotIds.push(crew.pilotId)
      busy.aircraftIds.push(crew.aircraftId)
    }
  }
  return busy
}

/** Adds the pilots who rest, and the aircraft with a destroyed module, under repair or on fire: none of them can fly. */
export function unavailableCrews(busy: BusyCrews, rests: Rest[], hangarAircraft: HangarAircraft[]): BusyCrews {
  const unavailable: BusyCrews = { pilotIds: [...busy.pilotIds], aircraftIds: [...busy.aircraftIds] }
  for (const rest of rests) {
    unavailable.pilotIds.push(rest.pilotId)
  }
  for (const state of hangarAircraft) {
    if (state.destroyedModules.length > 0 || state.repairSeconds !== null || state.fireSeconds !== null) {
      unavailable.aircraftIds.push(state.aircraftId)
    }
  }
  return unavailable
}
