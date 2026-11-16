import * as THREE from 'three'
import { RUNWAY_TILE_COUNT, TILE_SIZE_METERS } from './airfield'

type TileKind = 'grass' | 'runwayStraight' | 'runwayEnd'
type Tile = { kind: TileKind; quarterTurns: number }

const COLUMNS = 14
const ROWS = 9
const RUNWAY_FIRST_COLUMN = 2
const RUNWAY_ROW = 4
const PIXELS_PER_TILE = 128
const QUARTER_TURN_RADIANS = Math.PI / 2
const GRASS_SHADE_COLUMN_FACTOR = 7
const GRASS_SHADE_ROW_FACTOR = 13
const GRASS_COLORS = ['#6e7332', '#6a6f30', '#72773a']
const CONCRETE_COLOR = '#8b8378'
const MARKING_COLOR = '#eeebe4'
const RUNWAY_BAND_RATIO = 0.5
const RUNWAY_END_RATIO = 0.8
const MARKING_LINE_RATIO = 0.04
const DASH_RANGES = [
  [0.1, 0.35],
  [0.6, 0.85],
]
const THRESHOLD_BAR_RANGE = [0.68, 0.73]

function buildTileMap(): Tile[][] {
  const lastColumn = RUNWAY_FIRST_COLUMN + RUNWAY_TILE_COUNT - 1
  const tiles: Tile[][] = []
  for (let row = 0; row < ROWS; row += 1) {
    const rowTiles: Tile[] = []
    for (let column = 0; column < COLUMNS; column += 1) {
      rowTiles.push({ kind: 'grass', quarterTurns: 0 })
    }
    tiles.push(rowTiles)
  }
  for (let column = RUNWAY_FIRST_COLUMN; column <= lastColumn; column += 1) {
    tiles[RUNWAY_ROW][column] = { kind: 'runwayStraight', quarterTurns: 0 }
  }
  tiles[RUNWAY_ROW][RUNWAY_FIRST_COLUMN] = { kind: 'runwayEnd', quarterTurns: 2 }
  tiles[RUNWAY_ROW][lastColumn] = { kind: 'runwayEnd', quarterTurns: 0 }
  return tiles
}

/** Draws a runway band that enters through the west edge and runs for the given length, markings inside the tile. */
function drawRunway(context: CanvasRenderingContext2D, length: number, isEnd: boolean): void {
  const size = PIXELS_PER_TILE
  const bandTop = (size * (1 - RUNWAY_BAND_RATIO)) / 2
  const bandHeight = size * RUNWAY_BAND_RATIO
  const lineHeight = size * MARKING_LINE_RATIO
  context.fillStyle = CONCRETE_COLOR
  context.fillRect(0, bandTop, length, bandHeight)
  context.fillStyle = MARKING_COLOR
  const dashRanges = isEnd ? DASH_RANGES.slice(0, 1) : DASH_RANGES
  for (const [start, end] of dashRanges) {
    context.fillRect(size * start, size / 2 - lineHeight / 2, size * (end - start), lineHeight)
  }
  if (isEnd) {
    const [start, end] = THRESHOLD_BAR_RANGE
    context.fillRect(size * start, bandTop + lineHeight, size * (end - start), bandHeight - 2 * lineHeight)
  }
}

function drawTile(context: CanvasRenderingContext2D, tile: Tile, column: number, row: number): void {
  const size = PIXELS_PER_TILE
  context.save()
  context.translate(column * size + size / 2, row * size + size / 2)
  context.rotate(tile.quarterTurns * QUARTER_TURN_RADIANS)
  context.translate(-size / 2, -size / 2)
  context.fillStyle = GRASS_COLORS[(column * GRASS_SHADE_COLUMN_FACTOR + row * GRASS_SHADE_ROW_FACTOR) % GRASS_COLORS.length]
  context.fillRect(0, 0, size, size)
  if (tile.kind === 'runwayStraight') {
    drawRunway(context, size, false)
  }
  if (tile.kind === 'runwayEnd') {
    drawRunway(context, size * RUNWAY_END_RATIO, true)
  }
  context.restore()
}

/** The ground: a map of 2D tiles painted on one plane. Placeholder drawing until the generated tiles replace it. */
export function createTerrain(): THREE.Mesh {
  const canvas = document.createElement('canvas')
  canvas.width = COLUMNS * PIXELS_PER_TILE
  canvas.height = ROWS * PIXELS_PER_TILE
  const context = canvas.getContext('2d')!
  const tiles = buildTileMap()
  tiles.forEach((rowTiles, row) => {
    rowTiles.forEach((tile, column) => drawTile(context, tile, column, row))
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const terrain = new THREE.Mesh(
    new THREE.PlaneGeometry(COLUMNS * TILE_SIZE_METERS, ROWS * TILE_SIZE_METERS),
    new THREE.MeshBasicMaterial({ map: texture }),
  )
  terrain.position.set((COLUMNS / 2 - RUNWAY_FIRST_COLUMN) * TILE_SIZE_METERS, (RUNWAY_ROW + 0.5 - ROWS / 2) * TILE_SIZE_METERS, 0)
  return terrain
}
