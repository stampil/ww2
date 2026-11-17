import type { AircraftState } from './aircraftState'
import { RUNWAY_LENGTH_METERS } from './airfield'

/** Where the aircraft is and how it is turned at one moment of the takeoff, in world meters and radians. */
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
const HOLD_SECONDS = 1
const ROLL_SECONDS = 8
const STRAIGHT_CLIMB_SECONDS = 1.5
const TURN_SECONDS = 6
const SWING_SECONDS = 2
const FRONT_VIEW_SECONDS = 4
const TURN_END_SECONDS = HOLD_SECONDS + ROLL_SECONDS + STRAIGHT_CLIMB_SECONDS + TURN_SECONDS
const FRONT_VIEW_START_SECONDS = TURN_END_SECONDS + SWING_SECONDS
const LOOP_SECONDS = FRONT_VIEW_START_SECONDS + FRONT_VIEW_SECONDS
const TURN_ANGLE_RADIANS = 90 * DEGREES
const BANK_RADIANS = 15 * DEGREES
const BANK_RAMP_SECONDS = 1.2
const LIFTOFF_PITCH_RADIANS = 8 * DEGREES
const ROTATION_SECONDS = 1
const CLIMB_RATE_METERS_PER_SECOND = 3
const CLIMB_RAMP_SECONDS = 1
const ENGINE_RAMP_SECONDS = 3
const GEAR_RETRACT_SECONDS = 2
const FLAP_RETRACT_DELAY_SECONDS = 2
const FLAP_RETRACT_SECONDS = 3
const RUDDER_TURN_SHARE = 0.4

/** A swing from 0 to 1 and back to 0 between start and end. */
function bump(start: number, end: number, value: number): number {
  return Math.sin(Math.PI * clamp((value - start) / (end - start), 0, 1))
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}

function smoothStep(start: number, end: number, value: number): number {
  const progress = clamp((value - start) / (end - start), 0, 1)
  return progress * progress * (3 - 2 * progress)
}

/** The altitude gained when the climb rate grows smoothly from zero to its steady value. */
function climbedMeters(flightSeconds: number): number {
  if (flightSeconds < CLIMB_RAMP_SECONDS) {
    return (CLIMB_RATE_METERS_PER_SECOND * flightSeconds * flightSeconds) / (2 * CLIMB_RAMP_SECONDS)
  }
  return CLIMB_RATE_METERS_PER_SECOND * (flightSeconds - CLIMB_RAMP_SECONDS / 2)
}

/**
 * The takeoff, looping: hold, ground roll, climb, a right turn banked on the wings, then the camera swings in front
 * of the aircraft and the gear retracts. Heading is counterclockwise from the +x axis, so a right turn lowers it.
 */
export function takeoffPose(elapsedSeconds: number): TakeoffPose {
  const time = elapsedSeconds % LOOP_SECONDS
  const rollDistance = RUNWAY_LENGTH_METERS - START_X_METERS
  const liftoffSpeed = (2 * rollDistance) / ROLL_SECONDS
  const turnRadius = (liftoffSpeed * TURN_SECONDS) / TURN_ANGLE_RADIANS

  const rollSeconds = clamp(time - HOLD_SECONDS, 0, ROLL_SECONDS)
  const flightSeconds = Math.max(0, time - HOLD_SECONDS - ROLL_SECONDS)
  const straightSeconds = Math.min(flightSeconds, STRAIGHT_CLIMB_SECONDS)
  const turnSeconds = clamp(flightSeconds - STRAIGHT_CLIMB_SECONDS, 0, TURN_SECONDS)
  const afterTurnSeconds = Math.max(0, flightSeconds - STRAIGHT_CLIMB_SECONDS - TURN_SECONDS)

  const turnedRadians = (TURN_ANGLE_RADIANS * turnSeconds) / TURN_SECONDS
  const rolledShare = rollSeconds / ROLL_SECONDS

  const x =
    START_X_METERS +
    rollDistance * rolledShare * rolledShare +
    liftoffSpeed * straightSeconds +
    turnRadius * Math.sin(turnedRadians)
  const y = turnRadius * (Math.cos(turnedRadians) - 1) - liftoffSpeed * afterTurnSeconds

  const bankProgress =
    smoothStep(0, BANK_RAMP_SECONDS, turnSeconds) * (1 - smoothStep(TURN_SECONDS - BANK_RAMP_SECONDS, TURN_SECONDS, turnSeconds))

  const gearRetraction = smoothStep(FRONT_VIEW_START_SECONDS, FRONT_VIEW_START_SECONDS + GEAR_RETRACT_SECONDS, time)

  return {
    x,
    y,
    altitude: climbedMeters(flightSeconds),
    heading: -turnedRadians,
    pitch: LIFTOFF_PITCH_RADIANS * smoothStep(HOLD_SECONDS + ROLL_SECONDS - ROTATION_SECONDS, HOLD_SECONDS + ROLL_SECONDS, time),
    roll: BANK_RADIANS * bankProgress,
    frontView: smoothStep(TURN_END_SECONDS, FRONT_VIEW_START_SECONDS, time),
    state: {
      engine: smoothStep(0, ENGINE_RAMP_SECONDS, time),
      gearRetraction,
      flaps: 1 - smoothStep(FLAP_RETRACT_DELAY_SECONDS, FLAP_RETRACT_DELAY_SECONDS + FLAP_RETRACT_SECONDS, flightSeconds),
      wheels: rolledShare * (1 - gearRetraction),
      aileron: bump(0, BANK_RAMP_SECONDS, turnSeconds) - bump(TURN_SECONDS - BANK_RAMP_SECONDS, TURN_SECONDS, turnSeconds),
      rudder: RUDDER_TURN_SHARE * bankProgress,
      elevator: -bump(HOLD_SECONDS + ROLL_SECONDS - ROTATION_SECONDS, HOLD_SECONDS + ROLL_SECONDS + ROTATION_SECONDS, time),
    },
  }
}
