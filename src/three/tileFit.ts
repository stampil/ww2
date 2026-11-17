import { SIDES, turnedBy } from './sides'
import type { Side } from './sides'
import { TILE_EDGES } from './tiles'
import type { EdgeKind, Tile, TileKind } from './tiles'

const QUARTER_TURN_COUNT = 4

/** The kind of edge a tile shows on a side, once it is turned. */
export function edgeOn(tile: Tile, side: Side): EdgeKind {
  return TILE_EDGES[tile.kind][turnedBy(side, -tile.quarterTurns)]
}

/**
 * Finds the tile, among these kinds and in any turn, whose edges are exactly these ones, indexed by side.
 * Throws when no tile has them.
 */
export function tileWithEdges(edgesBySide: readonly EdgeKind[], kinds: readonly TileKind[]): Tile {
  for (const kind of kinds) {
    for (let quarterTurns = 0; quarterTurns < QUARTER_TURN_COUNT; quarterTurns += 1) {
      const tile: Tile = { kind, quarterTurns }
      if (hasEdges(tile, edgesBySide)) {
        return tile
      }
    }
  }
  throw new Error('No tile has the edges asked for.')
}

function hasEdges(tile: Tile, edgesBySide: readonly EdgeKind[]): boolean {
  for (const side of SIDES) {
    if (edgeOn(tile, side) !== edgesBySide[side]) {
      return false
    }
  }
  return true
}
