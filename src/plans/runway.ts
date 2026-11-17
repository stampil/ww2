import type { TileKind } from '../three/tiles'
import type { TerrainPlan } from './terrainPlan'

/** The runway of a plan: a horizontal line of tiles on one row, from its first column to its last. */
export type PlanRunway = { row: number; firstColumn: number; lastColumn: number }

const RUNWAY_KINDS: TileKind[] = ['runwayStraight', 'runwayEnd', 'runwayTaxiwayJunction', 'runwayTaxiwayCrossing']

export function runwayOf(plan: TerrainPlan): PlanRunway {
  const runway: PlanRunway = { row: 0, firstColumn: Infinity, lastColumn: -Infinity }
  for (let row = 0; row < plan.tiles.length; row += 1) {
    for (let column = 0; column < plan.tiles[row].length; column += 1) {
      if (RUNWAY_KINDS.includes(plan.tiles[row][column].kind)) {
        runway.row = row
        runway.firstColumn = Math.min(runway.firstColumn, column)
        runway.lastColumn = Math.max(runway.lastColumn, column)
      }
    }
  }
  return runway
}
