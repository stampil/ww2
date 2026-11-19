const TWO_PI = Math.PI * 2
const DEGREES = Math.PI / 180
const ROLL_WAVES = [
  { periodSeconds: 2.3, share: 0.6, phaseRadians: 0 },
  { periodSeconds: 3.7, share: 0.4, phaseRadians: 1.3 },
]
const PITCH_WAVES = [
  { periodSeconds: 3.1, share: 0.6, phaseRadians: 0.7 },
  { periodSeconds: 5.3, share: 0.4, phaseRadians: 2.1 },
]

/** How far the sway tilts an aircraft in the air at most, sideways and nose up or down, and how far the ailerons follow the turning of the roll. */
export const SWAY_ROLL_RADIANS = 8 * DEGREES
export const SWAY_PITCH_RADIANS = 3 * DEGREES
export const SWAY_AILERON_SHARE = 0.25

/**
 * The slow, uneven sway of an aircraft in the air: the waves of its roll and of its pitch never line up, so it never repeats exactly. `roll`, `pitch` and
 * `rate` each go from -1 to 1, and `rate` is the turning of the roll, which the ailerons follow.
 */
export function swayAt(seconds: number): { roll: number; pitch: number; rate: number } {
  let roll = 0
  let rate = 0
  for (const wave of ROLL_WAVES) {
    const angle = (TWO_PI * seconds) / wave.periodSeconds + wave.phaseRadians
    roll += wave.share * Math.sin(angle)
    rate += wave.share * Math.cos(angle)
  }
  let pitch = 0
  for (const wave of PITCH_WAVES) {
    pitch += wave.share * Math.sin((TWO_PI * seconds) / wave.periodSeconds + wave.phaseRadians)
  }
  return { roll, pitch, rate }
}
