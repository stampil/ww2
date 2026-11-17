import { SeededRandom } from './SeededRandom'
import { Side, SIDES } from './sides'
import { edgeOn } from './tileFit'
import { TILE_EDGES } from './tiles'
import type { Tile, TileKind } from './tiles'

const COLUMNS = 4
const ROWS = 4
const QUARTER_TURN_COUNT = 4
const TILE_KINDS = Object.keys(TILE_EDGES) as TileKind[]

/** A small square of tiles drawn at random to test the look of tiles laid end to end, with the seed that made it. */
export type TilePatch = { seed: number; tiles: Tile[][] }

/**
 * Draws a square of tiles at random, each in a random turn, that fit side by side: the sides that touch have the same
 * edge kind. A tile with no choice left sends the draw back to the tile before it.
 */
export class TilePatchGenerator {
  private readonly distinctTiles = this.findDistinctTiles()

  generate(seed: number): TilePatch {
    // A square of grass tiles always fits, so the draw cannot come back empty.
    const placed = this.fill(new SeededRandom(seed), [])!
    const tiles: Tile[][] = []
    for (let row = 0; row < ROWS; row += 1) {
      tiles.push(placed.slice(row * COLUMNS, (row + 1) * COLUMNS))
    }
    return { seed, tiles }
  }

  /** The tiles of the whole square, or null when no tile fits after the ones laid so far, row after row from the north-west. */
  private fill(random: SeededRandom, placed: Tile[]): Tile[] | null {
    if (placed.length === COLUMNS * ROWS) {
      return placed
    }
    for (const tile of random.shuffled(this.tilesFitting(placed))) {
      const completed = this.fill(random, [...placed, tile])
      if (completed !== null) {
        return completed
      }
    }
    return null
  }

  private tilesFitting(placed: Tile[]): Tile[] {
    const index = placed.length
    const north = index >= COLUMNS ? placed[index - COLUMNS] : null
    const west = index % COLUMNS > 0 ? placed[index - 1] : null
    const fitting: Tile[] = []
    for (const tile of this.distinctTiles) {
      const fitsNorth = north === null || edgeOn(north, Side.South) === edgeOn(tile, Side.North)
      const fitsWest = west === null || edgeOn(west, Side.East) === edgeOn(tile, Side.West)
      if (fitsNorth && fitsWest) {
        fitting.push(tile)
      }
    }
    return fitting
  }

  /** Every kind in every turn, except the turns that give a kind the same edges again. */
  private findDistinctTiles(): Tile[] {
    const bySignature = new Map<string, Tile>()
    for (const kind of TILE_KINDS) {
      for (let quarterTurns = 0; quarterTurns < QUARTER_TURN_COUNT; quarterTurns += 1) {
        const tile: Tile = { kind, quarterTurns }
        const signature = `${kind}:${this.edgeSignature(tile)}`
        if (!bySignature.has(signature)) {
          bySignature.set(signature, tile)
        }
      }
    }
    return [...bySignature.values()]
  }

  private edgeSignature(tile: Tile): string {
    return SIDES.map((side) => edgeOn(tile, side)).join(',')
  }
}
