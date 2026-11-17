import { Runway } from './Runway'
import { SeededRandom } from './SeededRandom'
import { columnStepOf, oppositeOf, rowStepOf, Side, SIDES } from './sides'
import { TaxiwayNetwork } from './TaxiwayNetwork'
import { tileWithEdges } from './tileFit'
import type { EdgeKind, Tile, TileKind } from './tiles'

const COLUMNS = 14
const ROWS = 9
const RUNWAY_ROW = 4
const RUNWAY_FIRST_COLUMN = 2
const MIN_RUNWAY_LENGTH = 3
const MAX_RUNWAY_LENGTH = 6
const MIN_TAXIWAY_CELLS = 2
const MAX_TAXIWAY_CELLS = 4
const MIN_LATERAL_CELLS = 1
const MAX_LATERAL_CELLS = 2
const MIN_BUSHES = 4
const MAX_BUSHES = 8
const EXIT_PERCENT = 50
const CROSSING_PERCENT = 30
const LATERAL_BRANCH_PERCENT = 50
const END_APRON_PERCENT = 50
const RUNWAY_KINDS: TileKind[] = ['runwayStraight', 'runwayEnd', 'runwayTaxiwayJunction', 'runwayTaxiwayCrossing']
const TAXIWAY_KINDS: TileKind[] = ['taxiwayStraight', 'taxiwayCurve', 'taxiwayT', 'taxiwayCross']
const GRASS_TILE: Tile = { kind: 'grass', quarterTurns: 0 }
const BUSHES_TILE: Tile = { kind: 'bushes', quarterTurns: 0 }

type Cell = { row: number; column: number }
/** An airfield: the runway and the tiles, rows from the north and columns from the west. */
export type TerrainMap = { columns: number; runway: Runway; tiles: Tile[][] }

/**
 * Makes an airfield from a seed: a straight runway of three to six tiles whose middle tiles may each have an exit,
 * taxiways, then grass and bushes. Every tile touches its neighbours with the same edge kind, so any seed gives a valid terrain.
 */
export class TerrainGenerator {
  generate(seed: number): TerrainMap {
    const random = new SeededRandom(seed)
    const runway = new Runway(RUNWAY_ROW, RUNWAY_FIRST_COLUMN, random.integer(MIN_RUNWAY_LENGTH, MAX_RUNWAY_LENGTH))
    const network = this.layTaxiways(random, runway)

    const tiles: Tile[][] = []
    for (let row = 0; row < ROWS; row += 1) {
      const rowTiles: Tile[] = []
      for (let column = 0; column < COLUMNS; column += 1) {
        rowTiles.push(this.tileAt(random, runway, network, row, column))
      }
      tiles.push(rowTiles)
    }
    this.addBushes(random, tiles)

    return { columns: COLUMNS, runway, tiles }
  }

  private layTaxiways(random: SeededRandom, runway: Runway): TaxiwayNetwork {
    const network = new TaxiwayNetwork()
    const innerColumns: number[] = []
    for (let column = runway.firstColumn + 1; column < runway.lastColumn(); column += 1) {
      innerColumns.push(column)
    }
    const exitColumns: number[] = []
    for (const column of innerColumns) {
      if (random.happens(EXIT_PERCENT)) {
        exitColumns.push(column)
      }
    }
    if (exitColumns.length === 0) {
      exitColumns.push(random.pickOne(innerColumns))
    }
    for (const column of exitColumns) {
      const outward = random.pickOne([Side.North, Side.South])
      this.layTaxiway(random, network, runway, column, outward)
      if (random.happens(CROSSING_PERCENT)) {
        this.layTaxiway(random, network, runway, column, oppositeOf(outward))
      }
    }
    return network
  }

  /** A taxiway straight out from the runway, perhaps with a branch at its tip turning east or west. */
  private layTaxiway(random: SeededRandom, network: TaxiwayNetwork, runway: Runway, column: number, outward: Side): void {
    let row = runway.row
    const cellsToLay = random.integer(MIN_TAXIWAY_CELLS, MAX_TAXIWAY_CELLS)
    for (let laid = 0; laid < cellsToLay; laid += 1) {
      network.link(row, column, outward)
      row += rowStepOf(outward)
    }

    if (random.happens(LATERAL_BRANCH_PERCENT)) {
      const lateral = random.pickOne([Side.East, Side.West])
      const lateralCells = random.integer(MIN_LATERAL_CELLS, MAX_LATERAL_CELLS)
      let lateralColumn = column
      for (let laid = 0; laid < lateralCells && this.isInside(row, lateralColumn + columnStepOf(lateral)); laid += 1) {
        network.link(row, lateralColumn, lateral)
        lateralColumn += columnStepOf(lateral)
      }
    }
  }

  private tileAt(random: SeededRandom, runway: Runway, network: TaxiwayNetwork, row: number, column: number): Tile {
    const isOnRunway = runway.covers(row, column)
    if (!isOnRunway && !network.crosses(row, column)) {
      return GRASS_TILE
    }

    const edges: EdgeKind[] = []
    for (const side of SIDES) {
      edges[side] = this.edgeOn(runway, network, row, column, side)
    }
    return tileWithEdges(edges, isOnRunway ? RUNWAY_KINDS : this.taxiwayKinds(random))
  }

  private edgeOn(runway: Runway, network: TaxiwayNetwork, row: number, column: number, side: Side): EdgeKind {
    if (network.isLinked(row, column, side)) {
      return 'taxiway'
    }
    const continuesEast = side === Side.East && column < runway.lastColumn()
    const continuesWest = side === Side.West && column > runway.firstColumn
    if (runway.covers(row, column) && (continuesEast || continuesWest)) {
      return 'runway'
    }
    return 'grass'
  }

  private taxiwayKinds(random: SeededRandom): TileKind[] {
    const end: TileKind = random.happens(END_APRON_PERCENT) ? 'taxiwayEndApron' : 'taxiwayEnd'
    return [...TAXIWAY_KINDS, end]
  }

  /** Replaces a few of the grass tiles by tiles with bushes. */
  private addBushes(random: SeededRandom, tiles: Tile[][]): void {
    const grassCells: Cell[] = []
    for (let row = 0; row < ROWS; row += 1) {
      for (let column = 0; column < COLUMNS; column += 1) {
        if (tiles[row][column].kind === 'grass') {
          grassCells.push({ row, column })
        }
      }
    }
    const bushCount = random.integer(MIN_BUSHES, MAX_BUSHES)
    for (const cell of random.shuffled(grassCells).slice(0, bushCount)) {
      tiles[cell.row][cell.column] = BUSHES_TILE
    }
  }

  private isInside(row: number, column: number): boolean {
    return row >= 0 && row < ROWS && column >= 0 && column < COLUMNS
  }
}
