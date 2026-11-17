import type { TileKind } from '../three/tiles'
import type { TerrainPlan } from './terrainPlan'

export type Cell = { row: number; column: number }
/** A cell of a path, with the cost of the whole path from its start up to this cell. */
export type PathStep = { cell: Cell; cost: number }

const ROAD_COST = 1
const GRASS_COST = 3
const BUSHES_COST = 5
const NEIGHBOUR_OFFSETS: Cell[] = [
  { row: -1, column: 0 },
  { row: 0, column: 1 },
  { row: 1, column: 0 },
  { row: 0, column: -1 },
]

type Node = { cell: Cell; cost: number; estimate: number; previous: Node | null }

function keyOf(cell: Cell): string {
  return `${cell.row},${cell.column}`
}

/** What it costs to walk onto a tile: the hard ground of a taxiway, a runway or an apron is fast, grass is slow, bushes slower. */
function costOf(kind: TileKind): number {
  if (kind === 'grass') {
    return GRASS_COST
  }
  if (kind === 'bushes') {
    return BUSHES_COST
  }
  return ROAD_COST
}

/** The tiles that have a sprite on them: nobody walks through a building. The start and the goal are left out, so a path can begin and end at one. */
function blockedKeys(plan: TerrainPlan, start: Cell, goal: Cell): Set<string> {
  const blocked = new Set<string>()
  for (const sprite of plan.sprites) {
    blocked.add(keyOf({ row: sprite.row, column: sprite.column }))
  }
  blocked.delete(keyOf(start))
  blocked.delete(keyOf(goal))
  return blocked
}

function pathEndingAt(last: Node): PathStep[] {
  const steps: PathStep[] = []
  for (let node: Node | null = last; node !== null; node = node.previous) {
    steps.unshift({ cell: node.cell, cost: node.cost })
  }
  return steps
}

/** The cheapest path from one tile to another over the grid of a terrain, found by A*; empty when there is none. */
export function findPath(plan: TerrainPlan, start: Cell, goal: Cell): PathStep[] {
  const rows = plan.tiles.length
  const columns = plan.tiles[0].length
  const blocked = blockedKeys(plan, start, goal)
  const bestCosts = new Map<string, number>([[keyOf(start), 0]])
  const open: Node[] = [{ cell: start, cost: 0, estimate: (Math.abs(goal.row - start.row) + Math.abs(goal.column - start.column)) * ROAD_COST, previous: null }]

  while (open.length > 0) {
    let cheapest = 0
    for (let place = 1; place < open.length; place += 1) {
      if (open[place].cost + open[place].estimate < open[cheapest].cost + open[cheapest].estimate) {
        cheapest = place
      }
    }
    const [current] = open.splice(cheapest, 1)
    if (current.cell.row === goal.row && current.cell.column === goal.column) {
      return pathEndingAt(current)
    }
    for (const offset of NEIGHBOUR_OFFSETS) {
      const cell = { row: current.cell.row + offset.row, column: current.cell.column + offset.column }
      const isOnGrid = cell.row >= 0 && cell.row < rows && cell.column >= 0 && cell.column < columns
      if (!isOnGrid || blocked.has(keyOf(cell))) {
        continue
      }
      const cost = current.cost + costOf(plan.tiles[cell.row][cell.column].kind)
      if (cost < (bestCosts.get(keyOf(cell)) ?? Infinity)) {
        bestCosts.set(keyOf(cell), cost)
        const estimate = (Math.abs(goal.row - cell.row) + Math.abs(goal.column - cell.column)) * ROAD_COST
        open.push({ cell, cost, estimate, previous: current })
      }
    }
  }
  return []
}
