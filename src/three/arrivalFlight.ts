import type { FlightPose } from './departureFlight'
import { D520_GROUND_PITCH_RADIANS } from './D520Model'
import { bump, smoothStep } from './easing'
import { SWAY_AILERON_SHARE, SWAY_PITCH_RADIANS, SWAY_ROLL_RADIANS, swayAt } from './sway'

const DEGREES = Math.PI / 180
const EAST_HEADING_RADIANS = 0
const CRUISE_ALTITUDE_METERS = 220
const APPROACH_ALTITUDE_METERS = 110
const APPROACH_SPEED_METERS_PER_SECOND = 36
const EXIT_SPEED_METERS_PER_SECOND = 12
// The high pass, the dive down to the altitude of the approach, then the glide to the runway.
const CRUISE_SECONDS = 5
const DIVE_SECONDS = 3.5
const GLIDE_SECONDS = 10
const DIVE_END_SECONDS = CRUISE_SECONDS + DIVE_SECONDS
const TOUCHDOWN_SECONDS = DIVE_END_SECONDS + GLIDE_SECONDS
// The nose follows the path in the dive, then comes up to the attitude of the approach, and up again in the flare.
const APPROACH_PITCH_RADIANS = -8 * DEGREES
const FLARE_PITCH_RADIANS = 6 * DEGREES
const PULL_OUT_SECONDS = 1.5
const PATH_SPAN_SECONDS = 0.1
const FLARE_SECONDS = 2
const TAIL_DOWN_SECONDS = 1.5
const CRUISE_ENGINE = 0.8
const APPROACH_ENGINE = 0.5
const ROLL_ENGINE = 0.3
const GEAR_LOWER_SECONDS = 2
const FLAPS_DELAY_SECONDS = 1
const FLAPS_LOWER_SECONDS = 2
const DIVE_PUSH_SECONDS = 1.5
// The camera swings to the side of the high pass as the aircraft appears, and back above the base once it has pulled out of the dive.
const SIDE_VIEW_SWING_SECONDS = 2

/**
 * The landing of an aircraft that comes in heading east along the runway: a high pass, a dive, a straight descent, a flare, the touchdown at
 * `touchdownX`, and a roll that slows it down to the speed of taxiing by the time it reaches `exitX`. Time is counted from the start of the high pass.
 */
export class ArrivalFlight {
  readonly durationSeconds: number
  private readonly startX: number
  private readonly deceleration: number

  constructor(
    private readonly touchdownX: number,
    exitX: number,
  ) {
    this.startX = touchdownX - APPROACH_SPEED_METERS_PER_SECOND * TOUCHDOWN_SECONDS
    this.deceleration = (APPROACH_SPEED_METERS_PER_SECOND ** 2 - EXIT_SPEED_METERS_PER_SECOND ** 2) / (2 * (exitX - touchdownX))
    this.durationSeconds = TOUCHDOWN_SECONDS + (APPROACH_SPEED_METERS_PER_SECOND - EXIT_SPEED_METERS_PER_SECOND) / this.deceleration
  }

  /** Where the aircraft is, along the runway, in the middle of its dive: the place the camera of the high pass looks at. */
  diveMiddleX(): number {
    return this.pose(CRUISE_SECONDS + DIVE_SECONDS / 2).x
  }

  /** How far the camera has swung from above the base (0) to the side of the high pass (1), at a time counted from the start of the high pass. */
  sideViewShare(time: number): number {
    const swingOutStart = DIVE_END_SECONDS + PULL_OUT_SECONDS
    return smoothStep(0, SIDE_VIEW_SWING_SECONDS, time) * (1 - smoothStep(swingOutStart, swingOutStart + SIDE_VIEW_SWING_SECONDS, time))
  }

  pose(time: number): FlightPose {
    const rolledSeconds = Math.max(0, time - TOUCHDOWN_SECONDS)
    const x =
      time <= TOUCHDOWN_SECONDS
        ? this.startX + APPROACH_SPEED_METERS_PER_SECOND * time
        : this.touchdownX + APPROACH_SPEED_METERS_PER_SECOND * rolledSeconds - (this.deceleration * rolledSeconds * rolledSeconds) / 2
    const speed = rolledSeconds === 0 ? APPROACH_SPEED_METERS_PER_SECOND : APPROACH_SPEED_METERS_PER_SECOND - this.deceleration * rolledSeconds
    const diveShare = smoothStep(CRUISE_SECONDS, DIVE_END_SECONDS, time)
    const approachShare = smoothStep(DIVE_END_SECONDS, DIVE_END_SECONDS + PULL_OUT_SECONDS, time)
    const gearRetraction = 1 - smoothStep(DIVE_END_SECONDS, DIVE_END_SECONDS + GEAR_LOWER_SECONDS, time)
    const flare = smoothStep(TOUCHDOWN_SECONDS - FLARE_SECONDS, TOUCHDOWN_SECONDS, time)
    const tailDown = smoothStep(TOUCHDOWN_SECONDS, TOUCHDOWN_SECONDS + TAIL_DOWN_SECONDS, time)
    const sway = swayAt(time)
    const airborneShare = 1 - flare
    const flightPitch = this.pathAngleAt(time) * (1 - approachShare) + APPROACH_PITCH_RADIANS * approachShare
    return {
      x,
      y: 0,
      altitude: this.altitudeAt(time),
      heading: EAST_HEADING_RADIANS,
      pitch:
        flightPitch * airborneShare +
        FLARE_PITCH_RADIANS * flare +
        (D520_GROUND_PITCH_RADIANS - FLARE_PITCH_RADIANS) * tailDown +
        SWAY_PITCH_RADIANS * sway.pitch * airborneShare,
      roll: SWAY_ROLL_RADIANS * sway.roll * airborneShare,
      state: {
        engine: time < TOUCHDOWN_SECONDS ? CRUISE_ENGINE + (APPROACH_ENGINE - CRUISE_ENGINE) * diveShare : ROLL_ENGINE,
        gearRetraction,
        flaps: smoothStep(DIVE_END_SECONDS + FLAPS_DELAY_SECONDS, DIVE_END_SECONDS + FLAPS_DELAY_SECONDS + FLAPS_LOWER_SECONDS, time),
        wheels: Math.min(1, speed / APPROACH_SPEED_METERS_PER_SECOND),
        aileron: SWAY_AILERON_SHARE * sway.rate * airborneShare,
        rudder: 0,
        elevator: bump(CRUISE_SECONDS, CRUISE_SECONDS + DIVE_PUSH_SECONDS, time) - bump(DIVE_END_SECONDS, DIVE_END_SECONDS + PULL_OUT_SECONDS, time),
      },
    }
  }

  /** Level at the altitude of the high pass, then the dive, which blends it into the straight glide that ends on the runway. */
  private altitudeAt(time: number): number {
    const flownSeconds = Math.min(time, TOUCHDOWN_SECONDS)
    const glideAltitude = APPROACH_ALTITUDE_METERS * (1 - (flownSeconds - DIVE_END_SECONDS) / GLIDE_SECONDS)
    return CRUISE_ALTITUDE_METERS + (glideAltitude - CRUISE_ALTITUDE_METERS) * smoothStep(CRUISE_SECONDS, DIVE_END_SECONDS, flownSeconds)
  }

  /** How steeply the aircraft is going down, as an angle, taken from a little before to a little after the time. */
  private pathAngleAt(time: number): number {
    const halfSpanSeconds = PATH_SPAN_SECONDS / 2
    const descent = this.altitudeAt(time + halfSpanSeconds) - this.altitudeAt(time - halfSpanSeconds)
    return Math.atan2(descent, APPROACH_SPEED_METERS_PER_SECOND * PATH_SPAN_SECONDS)
  }
}
