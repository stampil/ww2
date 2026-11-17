import type { FlightPose } from './departureFlight'
import { D520_GROUND_PITCH_RADIANS } from './D520Model'
import { smoothStep } from './easing'
import { swayAt } from './sway'

const DEGREES = Math.PI / 180
const WEST_HEADING_RADIANS = Math.PI
const APPROACH_ALTITUDE_METERS = 60
const APPROACH_SPEED_METERS_PER_SECOND = 36
const EXIT_SPEED_METERS_PER_SECOND = 12
const FLARE_PITCH_RADIANS = 6 * DEGREES
const SWAY_ROLL_RADIANS = 4 * DEGREES
const SWAY_AILERON_SHARE = 0.25
const FLARE_SECONDS = 2
const TAIL_DOWN_SECONDS = 1.5
const APPROACH_ENGINE = 0.5
const ROLL_ENGINE = 0.3

/**
 * The landing of an aircraft that comes in heading west along the runway: a straight descent from `startX`, a flare, the touchdown at
 * `touchdownX`, and a roll that slows it down to the speed of taxiing by the time it reaches `exitX`. Time is counted from the start of the approach.
 */
export class ArrivalFlight {
  readonly durationSeconds: number
  private readonly touchdownSeconds: number
  private readonly deceleration: number

  constructor(
    private readonly startX: number,
    touchdownX: number,
    exitX: number,
  ) {
    this.touchdownSeconds = (startX - touchdownX) / APPROACH_SPEED_METERS_PER_SECOND
    this.deceleration = (APPROACH_SPEED_METERS_PER_SECOND ** 2 - EXIT_SPEED_METERS_PER_SECOND ** 2) / (2 * (touchdownX - exitX))
    this.durationSeconds = this.touchdownSeconds + (APPROACH_SPEED_METERS_PER_SECOND - EXIT_SPEED_METERS_PER_SECOND) / this.deceleration
  }

  pose(time: number): FlightPose {
    const flownSeconds = Math.min(time, this.touchdownSeconds)
    const rolledSeconds = Math.max(0, time - this.touchdownSeconds)
    const x = this.startX - APPROACH_SPEED_METERS_PER_SECOND * flownSeconds - (APPROACH_SPEED_METERS_PER_SECOND * rolledSeconds - (this.deceleration * rolledSeconds * rolledSeconds) / 2)
    const speed = rolledSeconds === 0 ? APPROACH_SPEED_METERS_PER_SECOND : APPROACH_SPEED_METERS_PER_SECOND - this.deceleration * rolledSeconds
    const flare = smoothStep(this.touchdownSeconds - FLARE_SECONDS, this.touchdownSeconds, time)
    const tailDown = smoothStep(this.touchdownSeconds, this.touchdownSeconds + TAIL_DOWN_SECONDS, time)
    const sway = swayAt(time)
    const airborneShare = 1 - flare
    return {
      x,
      y: 0,
      altitude: APPROACH_ALTITUDE_METERS * (1 - flownSeconds / this.touchdownSeconds),
      heading: WEST_HEADING_RADIANS,
      pitch: FLARE_PITCH_RADIANS * flare + (D520_GROUND_PITCH_RADIANS - FLARE_PITCH_RADIANS) * tailDown,
      roll: SWAY_ROLL_RADIANS * sway.roll * airborneShare,
      state: {
        engine: time < this.touchdownSeconds ? APPROACH_ENGINE : ROLL_ENGINE,
        gearRetraction: 0,
        flaps: 1,
        wheels: Math.min(1, speed / APPROACH_SPEED_METERS_PER_SECOND),
        aileron: SWAY_AILERON_SHARE * sway.rate * airborneShare,
        rudder: 0,
        elevator: 0,
      },
    }
  }
}
