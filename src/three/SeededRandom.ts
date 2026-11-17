const UINT32_RANGE = 2 ** 32
const STEP = 0x6d2b79f5
const ODD_BIT = 1
const SECOND_MIX = 61
const FIRST_SHIFT = 15
const SECOND_SHIFT = 7
const THIRD_SHIFT = 14
const PERCENT = 100

/**
 * Draws the same numbers from the same seed (mulberry32, public domain), so that a seed always gives the same terrain.
 */
export class SeededRandom {
  private state: number

  constructor(seed: number) {
    this.state = seed >>> 0
  }

  /** A whole number from min to max, both included. */
  integer(min: number, max: number): number {
    return min + Math.floor(this.nextFraction() * (max - min + 1))
  }

  /** True with this many chances in a hundred. */
  happens(percent: number): boolean {
    return this.integer(1, PERCENT) <= percent
  }

  pickOne<Item>(items: readonly Item[]): Item {
    return items[this.integer(0, items.length - 1)]
  }

  /** The items in a random order; the list given is left as it is. */
  shuffled<Item>(items: readonly Item[]): Item[] {
    const result = [...items]
    for (let last = result.length - 1; last > 0; last -= 1) {
      const chosen = this.integer(0, last)
      const kept = result[chosen]
      result[chosen] = result[last]
      result[last] = kept
    }
    return result
  }

  /** A fraction from 0 included to 1 excluded; the state moves on. */
  private nextFraction(): number {
    this.state = (this.state + STEP) >>> 0
    let mixed = Math.imul(this.state ^ (this.state >>> FIRST_SHIFT), this.state | ODD_BIT)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> SECOND_SHIFT), mixed | SECOND_MIX)
    return ((mixed ^ (mixed >>> THIRD_SHIFT)) >>> 0) / UINT32_RANGE
  }
}
