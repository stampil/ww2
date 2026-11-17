import type { Flight } from './useBase'

/** The pilots and the aircraft that are on a flight. */
export type BusyCrews = { pilotIds: number[]; aircraftIds: number[] }

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
