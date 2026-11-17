import type { AircraftState } from './aircraftState'
import { D520_GROUND_PITCH_RADIANS } from './D520Model'
import { bump, clamp, smoothStep } from './easing'

/** Where the aircraft is and how it is turned at one moment of the takeoff, in world meters and radians, and how far the camera has swung to the front. */
export type TakeoffPose = {
  x: number
  y: number
  altitude: number
  heading: number
  pitch: number
  roll: number
  /** How far the camera has swung from above (0) to in front of the aircraft (1). */
  frontView: number
  state: AircraftState
}

const DEGREES = Math.PI / 180
const START_X_METERS = 6
const ACCELERATION_METERS_PER_SECOND_SQUARED = 4.8
const HOLD_SECONDS = 1
const STRAIGHT_CLIMB_SECONDS = 1.5
const TURN_SECONDS = 6
const SWING_SECONDS = 2
const FRONT_VIEW_SECONDS = 4
const TURN_ANGLE_RADIANS = 90 * DEGREES
const BANK_RADIANS = 15 * DEGREES
const BANK_RAMP_SECONDS = 1.2
const LIFTOFF_PITCH_RADIANS = 8 * DEGREES
// The tail comes up, from the resting nose-up attitude to level, between these shares of the roll.
const TAIL_LIFT_START_SHARE = 0.3
const TAIL_LIFT_END_SHARE = 0.5
const ROTATION_SECONDS = 1
const CLIMB_RATE_METERS_PER_SECOND = 3
const CLIMB_RAMP_SECONDS = 1
const ENGINE_RAMP_SECONDS = 3
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

/**
 * The takeoff along a runway of a given length, looping: hold, ground roll at a steady acceleration, climb, a right turn
 * banked on the wings, then the camera swings in front of the aircraft and the gear retracts.
 * Heading is counterclockwise from the +x axis, so a right turn lowers it.
 */
export class Takeoff {
  private readonly rollDistance: number
  private readonly rollSeconds: number
  private readonly liftoffSpeed: number
  private readonly turnRadius: number
  private readonly liftoffSeconds: number
  private readonly turnEndSeconds: number
  private readonly frontViewStartSeconds: number
  private readonly loopSeconds: number

  constructor(runwayLengthMeters: number) {
    this.rollDistance = runwayLengthMeters - START_X_METERS
    this.rollSeconds = Math.sqrt((2 * this.rollDistance) / ACCELERATION_METERS_PER_SECOND_SQUARED)
    this.liftoffSpeed = ACCELERATION_METERS_PER_SECOND_SQUARED * this.rollSeconds
    this.turnRadius = (this.liftoffSpeed * TURN_SECONDS) / TURN_ANGLE_RADIANS
    this.liftoffSeconds = HOLD_SECONDS + this.rollSeconds
    this.turnEndSeconds = this.liftoffSeconds + STRAIGHT_CLIMB_SECONDS + TURN_SECONDS
    this.frontViewStartSeconds = this.turnEndSeconds + SWING_SECONDS
    this.loopSeconds = this.frontViewStartSeconds + FRONT_VIEW_SECONDS
  }

  pose(elapsedSeconds: number): TakeoffPose {
    const time = elapsedSeconds % this.loopSeconds
    const rolledSeconds = clamp(time - HOLD_SECONDS, 0, this.rollSeconds)
    const flightSeconds = Math.max(0, time - this.liftoffSeconds)
    const straightSeconds = Math.min(flightSeconds, STRAIGHT_CLIMB_SECONDS)
    const turnSeconds = clamp(flightSeconds - STRAIGHT_CLIMB_SECONDS, 0, TURN_SECONDS)
    const afterTurnSeconds = Math.max(0, flightSeconds - STRAIGHT_CLIMB_SECONDS - TURN_SECONDS)

    const turnedRadians = (TURN_ANGLE_RADIANS * turnSeconds) / TURN_SECONDS
    const rolledShare = rolledSeconds / this.rollSeconds

    const x =
      START_X_METERS +
      this.rollDistance * rolledShare * rolledShare +
      this.liftoffSpeed * straightSeconds +
      this.turnRadius * Math.sin(turnedRadians)
    const y = this.turnRadius * (Math.cos(turnedRadians) - 1) - this.liftoffSpeed * afterTurnSeconds

    const bankProgress =
      smoothStep(0, BANK_RAMP_SECONDS, turnSeconds) * (1 - smoothStep(TURN_SECONDS - BANK_RAMP_SECONDS, TURN_SECONDS, turnSeconds))
    const gearRetraction = smoothStep(this.frontViewStartSeconds, this.frontViewStartSeconds + GEAR_RETRACT_SECONDS, time)

    return {
      x,
      y,
      altitude: climbedMeters(flightSeconds),
      heading: -turnedRadians,
      pitch:
        D520_GROUND_PITCH_RADIANS * (1 - smoothStep(TAIL_LIFT_START_SHARE, TAIL_LIFT_END_SHARE, rolledShare)) +
        LIFTOFF_PITCH_RADIANS * smoothStep(this.liftoffSeconds - ROTATION_SECONDS, this.liftoffSeconds, time),
      roll: BANK_RADIANS * bankProgress,
      frontView: smoothStep(this.turnEndSeconds, this.frontViewStartSeconds, time),
      state: {
        engine: smoothStep(0, ENGINE_RAMP_SECONDS, time),
        gearRetraction,
        flaps: 1 - smoothStep(FLAP_RETRACT_DELAY_SECONDS, FLAP_RETRACT_DELAY_SECONDS + FLAP_RETRACT_SECONDS, flightSeconds),
        wheels: rolledShare * (1 - gearRetraction),
        aileron: bump(0, BANK_RAMP_SECONDS, turnSeconds) - bump(TURN_SECONDS - BANK_RAMP_SECONDS, TURN_SECONDS, turnSeconds),
        rudder: RUDDER_TURN_SHARE * bankProgress,
        elevator: -bump(this.liftoffSeconds - ROTATION_SECONDS, this.liftoffSeconds + ROTATION_SECONDS, time),
      },
    }
  }
}
