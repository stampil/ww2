import type { FlightPose } from './departureFlight'
import { bump, clamp, smoothStep } from './easing'
import { SWAY_AILERON_SHARE, SWAY_PITCH_RADIANS, SWAY_ROLL_RADIANS, swayAt } from './sway'

const DEGREES = Math.PI / 180
const EAST_HEADING_RADIANS = 0
const CRUISE_ALTITUDE_METERS = 220
const APPROACH_SPEED_METERS_PER_SECOND = 36
const EXIT_SPEED_METERS_PER_SECOND = 12
// The high pass, then one gentle descent from its altitude to the runway: level at first, never steeper than a long glide, and level again for the touchdown.
const CRUISE_SECONDS = 5
const DESCENT_SECONDS = 19
const TOUCHDOWN_SECONDS = CRUISE_SECONDS + DESCENT_SECONDS
const TOUCHDOWN_SINK_METERS_PER_SECOND = 1.5
// The gear and the flaps come down from this moment of the descent, and the camera has left the side of the high pass a little later.
const CONFIGURATION_START_SECONDS = 11
const SIDE_VIEW_END_SECONDS = 13
// The nose follows the path down, then comes up in the flare.
const FLARE_PITCH_RADIANS = 6 * DEGREES
const PATH_SPAN_SECONDS = 0.1
const FLARE_SECONDS = 2
const TAIL_DOWN_SECONDS = 1.5
const CRUISE_ENGINE = 0.8
const APPROACH_ENGINE = 0.5
const ROLL_ENGINE = 0.3
const GEAR_LOWER_SECONDS = 2
const FLAPS_DELAY_SECONDS = 1
const FLAPS_LOWER_SECONDS = 2
const DESCENT_PUSH_SECONDS = 1.5
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

  /** Where the aircraft is, along the runway, in the middle of its descent: the place the camera of the high pass looks at. */
  descentMiddleX(): number {
    return this.xAt(CRUISE_SECONDS + DESCENT_SECONDS / 2)
  }

  /** How far along the runway the aircraft is, at a time counted from the start of the high pass. */
  private xAt(time: number): number {
    if (time <= TOUCHDOWN_SECONDS) {
      return this.startX + APPROACH_SPEED_METERS_PER_SECOND * time
    }
    const rolledSeconds = time - TOUCHDOWN_SECONDS
    return this.touchdownX + APPROACH_SPEED_METERS_PER_SECOND * rolledSeconds - (this.deceleration * rolledSeconds * rolledSeconds) / 2
  }

  /** How far the camera has swung from above the base (0) to the side of the high pass (1), at a time counted from the start of the high pass. */
  sideViewShare(time: number): number {
    return smoothStep(0, SIDE_VIEW_SWING_SECONDS, time) * (1 - smoothStep(SIDE_VIEW_END_SECONDS, SIDE_VIEW_END_SECONDS + SIDE_VIEW_SWING_SECONDS, time))
  }

  /** How fast the aircraft goes at a time counted from the start of the high pass: the speed of the approach, then slowing down from the touchdown. */
  speedAt(time: number): number {
    return APPROACH_SPEED_METERS_PER_SECOND - this.deceleration * Math.max(0, time - TOUCHDOWN_SECONDS)
  }

  /** `groundPitchRadians` is the nose-up angle the aircraft rests at, which the tail comes down to. */
  pose(time: number, groundPitchRadians: number): FlightPose {
    const speed = this.speedAt(time)
    const descentShare = smoothStep(CRUISE_SECONDS, CONFIGURATION_START_SECONDS, time)
    const gearRetraction = 1 - smoothStep(CONFIGURATION_START_SECONDS, CONFIGURATION_START_SECONDS + GEAR_LOWER_SECONDS, time)
    const flare = smoothStep(TOUCHDOWN_SECONDS - FLARE_SECONDS, TOUCHDOWN_SECONDS, time)
    const tailDown = smoothStep(TOUCHDOWN_SECONDS, TOUCHDOWN_SECONDS + TAIL_DOWN_SECONDS, time)
    const sway = swayAt(time)
    const airborneShare = 1 - flare
    const flightPitch = this.pathAngleAt(time)
    return {
      x: this.xAt(time),
      y: 0,
      altitude: this.altitudeAt(time),
      heading: EAST_HEADING_RADIANS,
      pitch:
        flightPitch * airborneShare +
        FLARE_PITCH_RADIANS * flare +
        (groundPitchRadians - FLARE_PITCH_RADIANS) * tailDown +
        SWAY_PITCH_RADIANS * sway.pitch * airborneShare,
      roll: SWAY_ROLL_RADIANS * sway.roll * airborneShare,
      state: {
        engine: time < TOUCHDOWN_SECONDS ? CRUISE_ENGINE + (APPROACH_ENGINE - CRUISE_ENGINE) * descentShare : ROLL_ENGINE,
        gearRetraction,
        flaps: smoothStep(CONFIGURATION_START_SECONDS + FLAPS_DELAY_SECONDS, CONFIGURATION_START_SECONDS + FLAPS_DELAY_SECONDS + FLAPS_LOWER_SECONDS, time),
        wheels: Math.min(1, speed / APPROACH_SPEED_METERS_PER_SECOND),
        aileron: SWAY_AILERON_SHARE * sway.rate * airborneShare,
        rudder: 0,
        elevator: bump(CRUISE_SECONDS, CRUISE_SECONDS + DESCENT_PUSH_SECONDS, time) - bump(TOUCHDOWN_SECONDS - FLARE_SECONDS, TOUCHDOWN_SECONDS, time),
      },
    }
  }

  /** Level at the altitude of the high pass, then a smooth curve down that meets the runway at a small sink rate. */
  private altitudeAt(time: number): number {
    const share = clamp((time - CRUISE_SECONDS) / DESCENT_SECONDS, 0, 1)

    return CRUISE_ALTITUDE_METERS * (2 * share ** 3 - 3 * share ** 2 + 1) + TOUCHDOWN_SINK_METERS_PER_SECOND * DESCENT_SECONDS * (share ** 2 - share ** 3)
  }

  /** How steeply the aircraft is going down, as an angle, taken from a little before to a little after the time. */
  private pathAngleAt(time: number): number {
    const halfSpanSeconds = PATH_SPAN_SECONDS / 2
    const descent = this.altitudeAt(time + halfSpanSeconds) - this.altitudeAt(time - halfSpanSeconds)
    return Math.atan2(descent, APPROACH_SPEED_METERS_PER_SECOND * PATH_SPAN_SECONDS)
  }
}
