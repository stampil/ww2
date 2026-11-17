import type { TileKind } from '../three/tiles'
import { findPath } from './pathfinding'
import type { PathStep } from './pathfinding'
import type { Cell, TerrainPlan } from './terrainPlan'

/** A point of the map, in tiles from its north-west corner: the middle of a tile has halves. */
export type MapPoint = { x: number; y: number }

/** The way of an aircraft from its stand: the taxiways to the runway, down the runway, then straight on until it is off the map. */
export type TakeoffRoute = {
  points: MapPoint[]
  /** How far from the first point each point lies, in tiles. */
  distances: number[]
  /** The distances at which the aircraft turns onto the runway, leaves the last tile of the runway, and is off the map. */
  runwayEntryDistance: number
  runwayEndDistance: number
  totalDistance: number
}

const RUNWAY_KINDS: TileKind[] = ['runwayStraight', 'runwayEnd', 'runwayTaxiwayJunction', 'runwayTaxiwayCrossing']
const HALF_TILE = 0.5
const OFF_MAP_TILES = 2

function centreOf(cell: Cell): MapPoint {
  return { x: cell.column + HALF_TILE, y: cell.row + HALF_TILE }
}

function lengthBetween(from: MapPoint, to: MapPoint): number {
  return Math.hypot(to.x - from.x, to.y - from.y)
}

/** The tiles of the runway, a horizontal line of tiles. */
function runwayCellsOf(plan: TerrainPlan): Cell[] {
  const cells: Cell[] = []
  for (let row = 0; row < plan.tiles.length; row += 1) {
    for (let column = 0; column < plan.tiles[row].length; column += 1) {
      if (RUNWAY_KINDS.includes(plan.tiles[row][column].kind)) {
        cells.push({ row, column })
      }
    }
  }
  return cells
}

/** The cheapest way from the stand to any tile of the runway. */
function cheapestPathToRunway(plan: TerrainPlan, stand: Cell, runwayCells: Cell[]): PathStep[] {
  let cheapest: PathStep[] = []
  let cheapestCost = Infinity
  for (const runwayCell of runwayCells) {
    const steps = findPath(plan, stand, runwayCell)
    if (steps.length > 0 && steps[steps.length - 1].cost < cheapestCost) {
      cheapest = steps
      cheapestCost = steps[steps.length - 1].cost
    }
  }
  return cheapest
}

/** The route of the aircraft on a stand: it rolls down the runway toward the end that gives it the longer run. */
export function takeoffRoute(plan: TerrainPlan, stand: Cell): TakeoffRoute {
  const runwayCells = runwayCellsOf(plan)
  const entry = cheapestPathToRunway(plan, stand, runwayCells)
  const entryCell = entry[entry.length - 1].cell
  const firstColumn = Math.min(...runwayCells.map((cell) => cell.column))
  const lastColumn = Math.max(...runwayCells.map((cell) => cell.column))
  const direction = lastColumn - entryCell.column >= entryCell.column - firstColumn ? 1 : -1
  const endColumn = direction > 0 ? lastColumn : firstColumn

  const points = entry.map((step) => centreOf(step.cell))
  const entryIndex = points.length - 1
  for (let column = entryCell.column + direction; column !== endColumn + direction; column += direction) {
    points.push(centreOf({ row: entryCell.row, column }))
  }
  const runwayEndIndex = points.length - 1
  const columns = plan.tiles[0].length
  points.push({ x: direction > 0 ? columns + OFF_MAP_TILES : -OFF_MAP_TILES, y: entryCell.row + HALF_TILE })

  const distances = [0]
  for (let index = 1; index < points.length; index += 1) {
    distances.push(distances[index - 1] + lengthBetween(points[index - 1], points[index]))
  }
  return {
    points,
    distances,
    runwayEntryDistance: distances[entryIndex],
    runwayEndDistance: distances[runwayEndIndex],
    totalDistance: distances[distances.length - 1],
  }
}

/** Where the aircraft is after a distance along its route; before the start and past the end it stays at the ends. */
export function pointAt(route: TakeoffRoute, distance: number): MapPoint {
  const clamped = Math.min(Math.max(distance, 0), route.totalDistance)
  let index = 1
  while (index < route.distances.length - 1 && route.distances[index] < clamped) {
    index += 1
  }
  const from = route.points[index - 1]
  const to = route.points[index]
  const share = (clamped - route.distances[index - 1]) / (route.distances[index] - route.distances[index - 1])
  return { x: from.x + (to.x - from.x) * share, y: from.y + (to.y - from.y) * share }
}
