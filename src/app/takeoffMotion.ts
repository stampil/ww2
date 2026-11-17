import { pointAt } from '../plans/takeoffRoute'
import type { TakeoffRoute } from '../plans/takeoffRoute'

// The figures are mine: tiles and seconds, picked so that the start is sharp and the whole takeoff lasts about three seconds.
const START_ACCELERATION = 18
const TAXI_SPEED = 4
const RUN_ACCELERATION = 7
const LIFTOFF_SPEED = 10
const SAMPLE_STEP = 0.15
const HEADING_SPAN = 0.35
const TURN_IN_DISTANCE = 0.6
const CLIMB_SCALE = 1.9
const FADE_SHARE = 0.4
const PERCENT = 100
const HALF_TURN_DEGREES = 180
const FULL_TURN_DEGREES = 360
const MILLISECONDS_PER_SECOND = 1000
const RAMP_DISTANCE = (TAXI_SPEED * TAXI_SPEED) / (2 * START_ACCELERATION)
const RAMP_SECONDS = TAXI_SPEED / START_ACCELERATION

/** How fast the aircraft goes where it turns onto the runway: the taxi speed, unless the taxiway was too short to reach it. */
function runwayEntrySpeed(route: TakeoffRoute): number {
  return route.runwayEntryDistance < RAMP_DISTANCE ? Math.sqrt(2 * START_ACCELERATION * route.runwayEntryDistance) : TAXI_SPEED
}

/** When the aircraft is at a distance along its route: a sharp kick from the stand, a steady taxi, then full throttle down the runway. */
function secondsAt(route: TakeoffRoute, distance: number): number {
  if (distance <= route.runwayEntryDistance) {
    return distance < RAMP_DISTANCE ? Math.sqrt((2 * distance) / START_ACCELERATION) : RAMP_SECONDS + (distance - RAMP_DISTANCE) / TAXI_SPEED
  }
  const entrySpeed = runwayEntrySpeed(route)
  const runSeconds = (Math.sqrt(entrySpeed * entrySpeed + 2 * RUN_ACCELERATION * (distance - route.runwayEntryDistance)) - entrySpeed) / RUN_ACCELERATION
  return secondsAt(route, route.runwayEntryDistance) + runSeconds
}

/** Where the wheels leave the ground: when the speed is high enough, or at the end of the runway. */
function liftoffDistance(route: TakeoffRoute): number {
  const entrySpeed = runwayEntrySpeed(route)
  const runDistance = (LIFTOFF_SPEED * LIFTOFF_SPEED - entrySpeed * entrySpeed) / (2 * RUN_ACCELERATION)
  return Math.min(route.runwayEntryDistance + runDistance, route.runwayEndDistance)
}

/** A rise from 0 to 1 that starts and ends gently. */
function smoothstep(share: number): number {
  return share * share * (3 - 2 * share)
}

/** The way the nose points, in degrees clockwise from north: along the route, turning in from the north over the first tiles. */
function headingAt(route: TakeoffRoute, distance: number): number {
  const before = pointAt(route, distance - HEADING_SPAN)
  const after = pointAt(route, distance + HEADING_SPAN)
  const routeHeading = (Math.atan2(after.x - before.x, before.y - after.y) * HALF_TURN_DEGREES) / Math.PI
  return routeHeading * smoothstep(Math.min(1, distance / TURN_IN_DISTANCE))
}

/** The takeoff of an aircraft along its route, as the frames of an animation of its position, heading, size and opacity. */
export function takeoffAnimation(route: TakeoffRoute, columns: number, rows: number): { keyframes: Keyframe[]; durationMilliseconds: number } {
  const totalSeconds = secondsAt(route, route.totalDistance)
  const liftoff = liftoffDistance(route)
  const fadeStart = route.totalDistance - FADE_SHARE * (route.totalDistance - liftoff)
  const sampleCount = Math.ceil(route.totalDistance / SAMPLE_STEP)
  const keyframes: Keyframe[] = []
  let previousHeading = 0

  for (let sample = 0; sample <= sampleCount; sample += 1) {
    const distance = Math.min(sample * SAMPLE_STEP, route.totalDistance)
    const point = pointAt(route, distance)
    let heading = headingAt(route, distance)
    heading += FULL_TURN_DEGREES * Math.round((previousHeading - heading) / FULL_TURN_DEGREES)
    previousHeading = heading
    const climb = distance > liftoff ? (distance - liftoff) / (route.totalDistance - liftoff) : 0
    const scale = 1 + (CLIMB_SCALE - 1) * climb
    const opacity = distance <= fadeStart ? 1 : 1 - (distance - fadeStart) / (route.totalDistance - fadeStart)
    keyframes.push({
      offset: secondsAt(route, distance) / totalSeconds,
      left: `${(point.x / columns) * PERCENT}%`,
      top: `${(point.y / rows) * PERCENT}%`,
      transform: `translate(-50%, -50%) rotate(${heading}deg) scale(${scale})`,
      opacity,
    })
  }
  return { keyframes, durationMilliseconds: totalSeconds * MILLISECONDS_PER_SECOND }
}
