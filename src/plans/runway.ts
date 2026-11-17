import type { TileKind } from '../three/tiles'
import type { TerrainPlan } from './terrainPlan'

/** The runway of a plan: a horizontal line of tiles on one row, from its first column to its last; aircraft come onto it at the first junction. */
export type PlanRunway = { row: number; firstColumn: number; lastColumn: number; entryColumn: number }

const JUNCTION_KINDS: TileKind[] = ['runwayTaxiwayJunction', 'runwayTaxiwayCrossing']
const RUNWAY_KINDS: TileKind[] = ['runwayStraight', 'runwayEnd', ...JUNCTION_KINDS]

export function runwayOf(plan: TerrainPlan): PlanRunway {
  const runway: PlanRunway = { row: 0, firstColumn: Infinity, lastColumn: -Infinity, entryColumn: Infinity }
  for (let row = 0; row < plan.tiles.length; row += 1) {
    for (let column = 0; column < plan.tiles[row].length; column += 1) {
      if (RUNWAY_KINDS.includes(plan.tiles[row][column].kind)) {
        runway.row = row
        runway.firstColumn = Math.min(runway.firstColumn, column)
        runway.lastColumn = Math.max(runway.lastColumn, column)
      }
      if (JUNCTION_KINDS.includes(plan.tiles[row][column].kind)) {
        runway.entryColumn = Math.min(runway.entryColumn, column)
      }
    }
  }
  return runway
}
