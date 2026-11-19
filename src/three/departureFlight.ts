import type { AircraftState } from './aircraftState'
import { D520_GROUND_PITCH_RADIANS } from './D520Model'
import { bump, clamp, smoothStep } from './easing'
import { SWAY_AILERON_SHARE, SWAY_PITCH_RADIANS, SWAY_ROLL_RADIANS, swayAt } from './sway'

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
const ACCELERATION_METERS_PER_SECOND_SQUARED = 6
const LIFTOFF_SPEED_METERS_PER_SECOND = 30
const STRAIGHT_CLIMB_SECONDS = 1.5
const TURN_SECONDS = 8
const RETURN_SECONDS = 16
const TURN_ANGLE_RADIANS = 180 * DEGREES
const BANK_RADIANS = 25 * DEGREES
const SWAY_RAMP_SECONDS = 1
const BANK_RAMP_SECONDS = 1.2
const LIFTOFF_PITCH_RADIANS = 18 * DEGREES
// The tail comes up, from the resting nose-up attitude to level, between these shares of the roll.
const TAIL_LIFT_START_SHARE = 0.3
const TAIL_LIFT_END_SHARE = 0.5
const ROTATION_SECONDS = 1
const CLIMB_RATE_METERS_PER_SECOND = 14
const CLIMB_RAMP_SECONDS = 1
const IDLE_ENGINE = 0.3
const ENGINE_SPOOL_SECONDS = 1.5
const GEAR_RETRACT_DELAY_SECONDS = 1
const GEAR_RETRACT_SECONDS = 2
const FLAP_RETRACT_DELAY_SECONDS = 2
const FLAP_RETRACT_SECONDS = 3
const RUDDER_TURN_SHARE = 0.4
// The camera swings in front of the aircraft once it has left the ground, stays there, and swings back above the base.
const FRONT_VIEW_SWING_SECONDS = 2
const FRONT_VIEW_HOLD_SECONDS = 5

/** The altitude gained when the climb rate grows smoothly from zero to its steady value. */
function climbedMeters(flightSeconds: number): number {
  if (flightSeconds < CLIMB_RAMP_SECONDS) {
    return (CLIMB_RATE_METERS_PER_SECOND * flightSeconds * flightSeconds) / (2 * CLIMB_RAMP_SECONDS)
  }
  return CLIMB_RATE_METERS_PER_SECOND * (flightSeconds - CLIMB_RAMP_SECONDS / 2)
}

/** The departure of an aircraft that starts to roll at a place of the runway, heading east: roll, climb, a half turn to the right, and back on the far side. */
export class DepartureFlight {
  readonly durationSeconds: number
  private readonly rollSeconds = LIFTOFF_SPEED_METERS_PER_SECOND / ACCELERATION_METERS_PER_SECOND_SQUARED
  private readonly turnRadius = (LIFTOFF_SPEED_METERS_PER_SECOND * TURN_SECONDS) / TURN_ANGLE_RADIANS

  constructor() {
    this.durationSeconds = this.rollSeconds + STRAIGHT_CLIMB_SECONDS + TURN_SECONDS + RETURN_SECONDS
  }

  /** How far the camera has swung from above the base (0) to in front of the aircraft (1), at a time counted from the start of the roll. */
  frontViewShare(time: number): number {
    const swingInStart = this.rollSeconds
    const swingOutStart = swingInStart + FRONT_VIEW_SWING_SECONDS + FRONT_VIEW_HOLD_SECONDS
    return smoothStep(swingInStart, swingInStart + FRONT_VIEW_SWING_SECONDS, time) * (1 - smoothStep(swingOutStart, swingOutStart + FRONT_VIEW_SWING_SECONDS, time))
  }

  /** `startX` is where the aircraft stands on the runway at the start of the roll. */
  pose(time: number, startX: number): FlightPose {
    const rolledSeconds = clamp(time, 0, this.rollSeconds)
    const flightSeconds = Math.max(0, time - this.rollSeconds)
    const straightSeconds = Math.min(flightSeconds, STRAIGHT_CLIMB_SECONDS)
    const turnSeconds = clamp(flightSeconds - STRAIGHT_CLIMB_SECONDS, 0, TURN_SECONDS)
    const returnSeconds = Math.max(0, flightSeconds - STRAIGHT_CLIMB_SECONDS - TURN_SECONDS)
    const turnedRadians = (TURN_ANGLE_RADIANS * turnSeconds) / TURN_SECONDS

    const x =
      startX +
      (ACCELERATION_METERS_PER_SECOND_SQUARED * rolledSeconds * rolledSeconds) / 2 +
      LIFTOFF_SPEED_METERS_PER_SECOND * (straightSeconds - returnSeconds) +
      this.turnRadius * Math.sin(turnedRadians)
    const y = this.turnRadius * (Math.cos(turnedRadians) - 1)

    const bankProgress =
      smoothStep(0, BANK_RAMP_SECONDS, turnSeconds) * (1 - smoothStep(TURN_SECONDS - BANK_RAMP_SECONDS, TURN_SECONDS, turnSeconds))
    const sway = swayAt(time)
    const airborneShare = smoothStep(0, SWAY_RAMP_SECONDS, flightSeconds)
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
      pitch:
        D520_GROUND_PITCH_RADIANS * (1 - smoothStep(TAIL_LIFT_START_SHARE, TAIL_LIFT_END_SHARE, rolledSeconds / this.rollSeconds)) +
        LIFTOFF_PITCH_RADIANS * smoothStep(this.rollSeconds - ROTATION_SECONDS, this.rollSeconds + ROTATION_SECONDS, time) +
        SWAY_PITCH_RADIANS * sway.pitch * airborneShare,
      roll: BANK_RADIANS * bankProgress + SWAY_ROLL_RADIANS * sway.roll * airborneShare,
      state: {
        engine: IDLE_ENGINE + (1 - IDLE_ENGINE) * smoothStep(-ENGINE_SPOOL_SECONDS, 0, time),
        gearRetraction,
        flaps: 1 - smoothStep(FLAP_RETRACT_DELAY_SECONDS, FLAP_RETRACT_DELAY_SECONDS + FLAP_RETRACT_SECONDS, flightSeconds),
        wheels: (rolledSeconds / this.rollSeconds) * (1 - gearRetraction),
        aileron: bump(0, BANK_RAMP_SECONDS, turnSeconds) - bump(TURN_SECONDS - BANK_RAMP_SECONDS, TURN_SECONDS, turnSeconds) + SWAY_AILERON_SHARE * sway.rate * airborneShare,
        rudder: RUDDER_TURN_SHARE * bankProgress,
        elevator: -bump(this.rollSeconds - ROTATION_SECONDS, this.rollSeconds + ROTATION_SECONDS, time),
      },
    }
  }
}
