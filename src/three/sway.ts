const TWO_PI = Math.PI * 2
const WAVES = [
  { periodSeconds: 2.3, share: 0.6, phaseRadians: 0 },
  { periodSeconds: 3.7, share: 0.4, phaseRadians: 1.3 },
]

/**
 * The slow, uneven sway of the wings of an aircraft in the air, as the air never holds one quite still: two waves that never line up, so it never repeats
 * exactly. `roll` and `rate` each go from -1 to 1, and `rate` is the turning of the roll, which the ailerons follow.
 */
export function swayAt(seconds: number): { roll: number; rate: number } {
  let roll = 0
  let rate = 0
  for (const wave of WAVES) {
    const angle = (TWO_PI * seconds) / wave.periodSeconds + wave.phaseRadians
    roll += wave.share * Math.sin(angle)
    rate += wave.share * Math.cos(angle)
  }
  return { roll, rate }
}
