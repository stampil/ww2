import type { AircraftState } from './aircraftState'
import { bump, clamp, smoothStep } from './easing'

/** Where an aircraft is and how it is turned at one moment, in world meters and radians, with its moving parts; heading is counterclockwise from +x. */
export type FlightPose = {
  x: number
  y: number
  altitude: number
  heading: number
  pitch: number
  roll: number
  state: AircraftState
}

const DEGREES = Math.PI / 180
/** Where the lead aircraft stands at the start of the runway, from its first end. */
export const DEPARTURE_START_X_METERS = 6
const ACCELERATION_METERS_PER_SECOND_SQUARED = 6
const LIFTOFF_SPEED_METERS_PER_SECOND = 45
const STRAIGHT_CLIMB_SECONDS = 1.5
const TURN_SECONDS = 7
const RETURN_SECONDS = 7
const TURN_ANGLE_RADIANS = 180 * DEGREES
const BANK_RADIANS = 25 * DEGREES
const BANK_RAMP_SECONDS = 1.2
const LIFTOFF_PITCH_RADIANS = 8 * DEGREES
const ROTATION_SECONDS = 1
const CLIMB_RATE_METERS_PER_SECOND = 4
const CLIMB_RAMP_SECONDS = 1
const IDLE_ENGINE = 0.3
const ENGINE_SPOOL_SECONDS = 1.5
const GEAR_RETRACT_DELAY_SECONDS = 1
const GEAR_RETRACT_SECONDS = 2
const FLAP_RETRACT_DELAY_SECONDS = 2
const FLAP_RETRACT_SECONDS = 3
const RUDDER_TURN_SHARE = 0.4

/** The altitude gained when the climb rate grows smoothly from zero to its steady value. */
function climbedMeters(flightSeconds: number): number {
  if (flightSeconds < CLIMB_RAMP_SECONDS) {
    return (CLIMB_RATE_METERS_PER_SECOND * flightSeconds * flightSeconds) / (2 * CLIMB_RAMP_SECONDS)
  }
  return CLIMB_RATE_METERS_PER_SECOND * (flightSeconds - CLIMB_RAMP_SECONDS / 2)
}

/** The departure of the lead aircraft from the start of the runway, heading east: roll, climb, a half turn to the right, and back on the far side. */
export class DepartureFlight {
  readonly durationSeconds: number
  private readonly rollSeconds = LIFTOFF_SPEED_METERS_PER_SECOND / ACCELERATION_METERS_PER_SECOND_SQUARED
  private readonly turnRadius = (LIFTOFF_SPEED_METERS_PER_SECOND * TURN_SECONDS) / TURN_ANGLE_RADIANS

  constructor() {
    this.durationSeconds = this.rollSeconds + STRAIGHT_CLIMB_SECONDS + TURN_SECONDS + RETURN_SECONDS
  }

  pose(time: number): FlightPose {
    const rolledSeconds = clamp(time, 0, this.rollSeconds)
    const flightSeconds = Math.max(0, time - this.rollSeconds)
    const straightSeconds = Math.min(flightSeconds, STRAIGHT_CLIMB_SECONDS)
    const turnSeconds = clamp(flightSeconds - STRAIGHT_CLIMB_SECONDS, 0, TURN_SECONDS)
    const returnSeconds = Math.max(0, flightSeconds - STRAIGHT_CLIMB_SECONDS - TURN_SECONDS)
    const turnedRadians = (TURN_ANGLE_RADIANS * turnSeconds) / TURN_SECONDS

    const x =
      DEPARTURE_START_X_METERS +
      (ACCELERATION_METERS_PER_SECOND_SQUARED * rolledSeconds * rolledSeconds) / 2 +
      LIFTOFF_SPEED_METERS_PER_SECOND * (straightSeconds - returnSeconds) +
      this.turnRadius * Math.sin(turnedRadians)
    const y = this.turnRadius * (Math.cos(turnedRadians) - 1)

    const bankProgress =
      smoothStep(0, BANK_RAMP_SECONDS, turnSeconds) * (1 - smoothStep(TURN_SECONDS - BANK_RAMP_SECONDS, TURN_SECONDS, turnSeconds))
    const gearRetraction = smoothStep(
      this.rollSeconds + GEAR_RETRACT_DELAY_SECONDS,
      this.rollSeconds + GEAR_RETRACT_DELAY_SECONDS + GEAR_RETRACT_SECONDS,
      time,
    )

    return {
      x,
      y,
      altitude: climbedMeters(flightSeconds),
      heading: -turnedRadians,
      pitch: LIFTOFF_PITCH_RADIANS * smoothStep(this.rollSeconds - ROTATION_SECONDS, this.rollSeconds, time),
      roll: BANK_RADIANS * bankProgress,
      state: {
        engine: IDLE_ENGINE + (1 - IDLE_ENGINE) * smoothStep(-ENGINE_SPOOL_SECONDS, 0, time),
        gearRetraction,
        flaps: 1 - smoothStep(FLAP_RETRACT_DELAY_SECONDS, FLAP_RETRACT_DELAY_SECONDS + FLAP_RETRACT_SECONDS, flightSeconds),
        wheels: (rolledSeconds / this.rollSeconds) * (1 - gearRetraction),
        aileron: bump(0, BANK_RAMP_SECONDS, turnSeconds) - bump(TURN_SECONDS - BANK_RAMP_SECONDS, TURN_SECONDS, turnSeconds),
        rudder: RUDDER_TURN_SHARE * bankProgress,
        elevator: -bump(this.rollSeconds - ROTATION_SECONDS, this.rollSeconds + ROTATION_SECONDS, time),
      },
    }
  }
}
