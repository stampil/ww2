/**
 * The moving parts of the aircraft at one moment: shares from 0 to 1, deflections from -1 to 1.
 * Aileron positive rolls right, rudder positive turns right, elevator positive lowers the trailing edge.
 */
export type AircraftState = {
  engine: number
  gearRetraction: number
  flaps: number
  wheels: number
  aileron: number
  rudder: number
  elevator: number
}
