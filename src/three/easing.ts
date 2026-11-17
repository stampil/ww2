export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}

/** A smooth rise from 0 to 1 between start and end. */
export function smoothStep(start: number, end: number, value: number): number {
  const progress = clamp((value - start) / (end - start), 0, 1)
  return progress * progress * (3 - 2 * progress)
}

/** A swing from 0 to 1 and back to 0 between start and end. */
export function bump(start: number, end: number, value: number): number {
  return Math.sin(Math.PI * clamp((value - start) / (end - start), 0, 1))
}
