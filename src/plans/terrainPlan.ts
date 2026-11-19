import type { Tile, TileKind } from '../three/tiles'
import { START_ROWS, START_SPRITES, START_STANDS } from './startPlan'

/** The five buildings a player can open; the control tower is the front's alone, the others are named as the API names them. */
export type BuildingName = 'controlTower' | 'headquarters' | 'workshop' | 'warehouse' | 'hangar'
/** The building sprites, named after their files in public/sprites/buildings. */
export type SpriteName =
  | 'anti-aircraft-bunker'
  | 'camouflaged-tents'
  | 'command-post'
  | 'control-tower'
  | 'depot'
  | 'hangar'
  | 'windsock'

/** A sprite whose bottom middle rests on the bottom middle of a tile; it opens a building, or only decorates the base. */
export type PlacedSprite = { sprite: SpriteName; row: number; column: number; widthTiles: number; building?: BuildingName }
/** A tile of the grid, by its row from the north and its column from the west. */
export type Cell = { row: number; column: number }
/** A terrain composed by hand: the tiles, rows from the north and columns from the west, the sprites standing on them, and where aircraft park. */
export type TerrainPlan = { tiles: Tile[][]; sprites: PlacedSprite[]; stands: Cell[] }

const GRASS_CELL = '...'
const KIND_LETTERS = 2
const CELL_KINDS: Record<string, TileKind> = {
  BU: 'bushes',
  AP: 'apron',
  TS: 'taxiwayStraight',
  TC: 'taxiwayCurve',
  TT: 'taxiwayT',
  TX: 'taxiwayCross',
  TE: 'taxiwayEnd',
  TA: 'taxiwayEndApron',
  RS: 'runwayStraight',
  RE: 'runwayEnd',
  RJ: 'runwayTaxiwayJunction',
  RX: 'runwayTaxiwayCrossing',
}

function parseCell(cell: string): Tile {
  if (cell === GRASS_CELL) {
    return { kind: 'grass', quarterTurns: 0 }
  }
  return { kind: CELL_KINDS[cell.slice(0, KIND_LETTERS)], quarterTurns: Number(cell.slice(KIND_LETTERS)) }
}

/** Reads rows of cells set apart by a space: three dots for grass, else two letters for the tile and its quarter turns. */
export function parseTiles(rows: readonly string[]): Tile[][] {
  const tiles: Tile[][] = []
  for (const row of rows) {
    const rowTiles: Tile[] = []
    for (const cell of row.split(' ')) {
      rowTiles.push(parseCell(cell))
    }
    tiles.push(rowTiles)
  }
  return tiles
}

/** The terrains of the game by the name that the API keeps for each base. */
export const TERRAIN_PLANS: Record<string, TerrainPlan> = {
  start: { tiles: parseTiles(START_ROWS), sprites: START_SPRITES, stands: START_STANDS },
}
