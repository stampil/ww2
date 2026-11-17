export type Range = { min: number; max: number }

export function randomBetween(range: Range): number {
  return range.min + Math.random() * (range.max - range.min)
}

function approach(value: number, target: number, maxStep: number): number {
  if (Math.abs(target - value) <= maxStep) {
    return target
  }
  return value + Math.sign(target - value) * maxStep
}

/** A position between 0 and 1 that eases toward its target in a fixed travel time. */
export class EasedValue {
  position = 0
  private target = 0

  constructor(private readonly travelSeconds: number) {}

  setTarget(target: number): void {
    this.target = target
  }

  /** Jumps to the position and stays there. */
  snap(position: number): void {
    this.position = position
    this.target = position
  }

  update(deltaSeconds: number): void {
    this.position = approach(this.position, this.target, deltaSeconds / this.travelSeconds)
  }
}
