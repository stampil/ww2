import type { Flight, FlightAlert, HangarAircraft, Rest } from './useBase'

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

/** Adds the pilots who rest, and the aircraft to inspect, with a destroyed module, under repair or on fire: none of them can fly. */
export function unavailableCrews(busy: BusyCrews, rests: Rest[], hangarAircraft: HangarAircraft[]): BusyCrews {
  const unavailable: BusyCrews = { pilotIds: [...busy.pilotIds], aircraftIds: [...busy.aircraftIds] }
  for (const rest of rests) {
    unavailable.pilotIds.push(rest.pilotId)
  }
  for (const state of hangarAircraft) {
    if (state.needsInspection || (state.destroyedModules ?? []).length > 0 || state.repairSeconds !== null || state.fireSeconds !== null) {
      unavailable.aircraftIds.push(state.aircraftId)
    }
  }
  return unavailable
}

/** An alert of a flight, with the flight it belongs to. */
export type FlightAlertOf = { alert: FlightAlert; flight: Flight }

/** The alerts that call the player now: due, not over, on a flight that is still in the air. */
export function dueAlerts(flights: Flight[]): FlightAlertOf[] {
  const due: FlightAlertOf[] = []
  for (const flight of flights) {
    if (flight.remainingSeconds > 0) {
      for (const alert of flight.alerts) {
        if (alert.dueSeconds === 0 && alert.state?.outcome == null) {
          due.push({ alert, flight })
        }
      }
    }
  }
  return due
}

/** The alert with this id, if some flight still has it. */
export function findAlert(flights: Flight[], alertId: number): FlightAlertOf | undefined {
  for (const flight of flights) {
    for (const alert of flight.alerts) {
      if (alert.id === alertId) {
        return { alert, flight }
      }
    }
  }
  return undefined
}
