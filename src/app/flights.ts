import type { AwayAircraft, Flight, FlightAlert, HangarAircraft, Rest } from './useBase'

/** The pilots and the aircraft that cannot go on a mission now. */
export type BusyCrews = { pilotIds: number[]; aircraftIds: number[] }

/** The pilots and the aircraft that are on a flight or stationed away. */
export function busyCrews(flights: Flight[], away: AwayAircraft[]): BusyCrews {
  const busy: BusyCrews = { pilotIds: [], aircraftIds: [] }
  for (const flight of flights) {
    for (const crew of flight.crews) {
      busy.pilotIds.push(crew.pilotId)
      busy.aircraftIds.push(crew.aircraftId)
    }
  }
  for (const stationed of away) {
    busy.pilotIds.push(stationed.pilotId)
    busy.aircraftIds.push(stationed.aircraftId)
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

/** Whether the player has begun the mini-game of the alert. */
export function isAlertStarted(alert: FlightAlert): boolean {
  return alert.state !== null || alert.cockpit !== null
}

/** Whether the mini-game of the alert has been played to its end. */
export function isAlertOver(alert: FlightAlert): boolean {
  return (alert.state?.outcome ?? alert.cockpit?.outcome ?? null) !== null
}

/** Whether the aircraft of an alert was lost to the flak or to an earlier combat of a capture, which has a combat for each defender flown by the aircraft in turn: a lost aircraft flies no more. */
function isAircraftLost(flight: Flight, alert: FlightAlert): boolean {
  return flight.alerts.some((earlier) => earlier.id < alert.id && earlier.kind !== 'dogfight' && earlier.aircraftId === alert.aircraftId && earlier.cockpit?.outcome === 'escaped')
}

/** The alerts that call the player now: due, not over, not of a lost aircraft, on a flight that is still in the air. */
export function dueAlerts(flights: Flight[]): FlightAlertOf[] {
  const due: FlightAlertOf[] = []
  for (const flight of flights) {
    if (flight.remainingSeconds > 0) {
      for (const alert of flight.alerts) {
        if (alert.dueSeconds === 0 && !isAlertOver(alert) && !isAircraftLost(flight, alert)) {
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
