import { columnStepOf, oppositeOf, rowStepOf } from './sides'
import type { Side } from './sides'

/** The links between neighbouring cells of the grid that a taxiway crosses, kept the same from both cells. */
export class TaxiwayNetwork {
  private readonly linkedSides = new Map<string, Set<Side>>()

  link(row: number, column: number, side: Side): void {
    this.open(row, column, side)
    this.open(row + rowStepOf(side), column + columnStepOf(side), oppositeOf(side))
  }

  crosses(row: number, column: number): boolean {
    return this.linkedSides.has(this.key(row, column))
  }

  isLinked(row: number, column: number, side: Side): boolean {
    return this.linkedSides.get(this.key(row, column))?.has(side) === true
  }

  private open(row: number, column: number, side: Side): void {
    const key = this.key(row, column)
    let sides = this.linkedSides.get(key)
    if (sides === undefined) {
      sides = new Set()
      this.linkedSides.set(key, sides)
    }
    sides.add(side)
  }

  private key(row: number, column: number): string {
    return `${row},${column}`
  }
}
