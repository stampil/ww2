/** Where a camera stands round its subject: how far from straight above, and how far round it, in radians. */
export type CameraBearing = { polarRadians: number; azimuthRadians: number }

const DESCENT_SECONDS = 1.5
const ORBIT_SECONDS = 6
const FULL_TURN_RADIANS = 2 * Math.PI

/** A progress from 0 to 1 that is slow at both ends, so that the camera sets off and comes to rest gently. */
function eased(progress: number): number {
  return progress * progress * (3 - 2 * progress)
}

function between(from: number, to: number, progress: number): number {
  return from + (to - from) * eased(progress)
}

/**
 * The tour of an aircraft seen by a camera that starts over it: it comes down to the profile, then goes once round the aircraft, and ends where it stopped coming down.
 * `isOver` is true from the last instant of the tour on.
 */
export function inspectionTourAt(elapsedSeconds: number, start: CameraBearing, profile: CameraBearing): { bearing: CameraBearing; isOver: boolean } {
  if (elapsedSeconds < DESCENT_SECONDS) {
    const progress = elapsedSeconds / DESCENT_SECONDS
    return {
      bearing: { polarRadians: between(start.polarRadians, profile.polarRadians, progress), azimuthRadians: between(start.azimuthRadians, profile.azimuthRadians, progress) },
      isOver: false,
    }
  }
  const orbitProgress = Math.min(1, (elapsedSeconds - DESCENT_SECONDS) / ORBIT_SECONDS)

  return {
    bearing: { polarRadians: profile.polarRadians, azimuthRadians: profile.azimuthRadians + FULL_TURN_RADIANS * eased(orbitProgress) },
    isOver: orbitProgress === 1,
  }
}
