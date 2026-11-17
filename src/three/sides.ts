/** One of the four sides of a tile, clockwise from the north. Rows grow toward the south, columns toward the east. */
export const Side = { North: 0, East: 1, South: 2, West: 3 } as const
export type Side = (typeof Side)[keyof typeof Side]

export const SIDES: readonly Side[] = [Side.North, Side.East, Side.South, Side.West]

const SIDE_COUNT = 4
const HALF_TURN = 2
// The steps of a move out through each side, in the order north, east, south, west.
const ROW_STEPS = [-1, 0, 1, 0]
const COLUMN_STEPS = [0, 1, 0, -1]

/** The side reached by turning clockwise by a number of quarter turns, which may be negative. */
export function turnedBy(side: Side, quarterTurns: number): Side {
  const turned = (side + quarterTurns) % SIDE_COUNT
  return (turned < 0 ? turned + SIDE_COUNT : turned) as Side
}

export function oppositeOf(side: Side): Side {
  return turnedBy(side, HALF_TURN)
}

/** The rows a step out through this side moves by: toward the north is -1, toward the south is 1. */
export function rowStepOf(side: Side): number {
  return ROW_STEPS[side]
}

/** The columns a step out through this side moves by: toward the east is 1, toward the west is -1. */
export function columnStepOf(side: Side): number {
  return COLUMN_STEPS[side]
}
