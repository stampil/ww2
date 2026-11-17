import * as THREE from 'three'
import { RUNWAY_TILE_COUNT, TILE_SIZE_METERS } from './airfield'
import { renderTileImage } from './tileImages'
import type { TerrainTextures } from './tileImages'
import type { Tile } from './tiles'

const COLUMNS = 14
const ROWS = 9
const RUNWAY_FIRST_COLUMN = 2
const RUNWAY_ROW = 4
const GRASS_URL = '/textures/herbe.png'
const CONCRETE_URL = '/textures/beton.png'
const BUSH_POSITIONS = [
  { row: 1, column: 3 },
  { row: 7, column: 1 },
  { row: 6, column: 9 },
  { row: 2, column: 11 },
  { row: 7, column: 4 },
  { row: 7, column: 12 },
]

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Cannot load ${url}`))
    image.src = url
  })
}

/** The airfield of the proof of concept: a runway of four tiles, a taxiway leaving it to an apron, and a few bushes. */
function buildTileMap(): Tile[][] {
  const tiles: Tile[][] = []
  for (let row = 0; row < ROWS; row += 1) {
    const rowTiles: Tile[] = []
    for (let column = 0; column < COLUMNS; column += 1) {
      rowTiles.push({ kind: 'grass', quarterTurns: 0 })
    }
    tiles.push(rowTiles)
  }
  for (const position of BUSH_POSITIONS) {
    tiles[position.row][position.column] = { kind: 'bushes', quarterTurns: 0 }
  }
  const lastRunwayColumn = RUNWAY_FIRST_COLUMN + RUNWAY_TILE_COUNT - 1
  tiles[RUNWAY_ROW][RUNWAY_FIRST_COLUMN] = { kind: 'runwayEnd', quarterTurns: 2 }
  tiles[RUNWAY_ROW][RUNWAY_FIRST_COLUMN + 1] = { kind: 'runwayTaxiwayJunction', quarterTurns: 0 }
  tiles[RUNWAY_ROW][RUNWAY_FIRST_COLUMN + 2] = { kind: 'runwayStraight', quarterTurns: 0 }
  tiles[RUNWAY_ROW][lastRunwayColumn] = { kind: 'runwayEnd', quarterTurns: 0 }
  tiles[RUNWAY_ROW + 1][RUNWAY_FIRST_COLUMN + 1] = { kind: 'taxiwayStraight', quarterTurns: 0 }
  tiles[RUNWAY_ROW + 2][RUNWAY_FIRST_COLUMN + 1] = { kind: 'taxiwayEndApron', quarterTurns: 0 }
  return tiles
}

/** The ground: a map of 2D tiles, one textured square each, so any tile can be moved or turned. */
export class Terrain {
  readonly object = new THREE.Group()

  constructor() {
    void this.build()
  }

  private async build(): Promise<void> {
    const [grass, concrete] = await Promise.all([loadImage(GRASS_URL), loadImage(CONCRETE_URL)])
    const textures: TerrainTextures = { grass, concrete }
    const geometry = new THREE.PlaneGeometry(TILE_SIZE_METERS, TILE_SIZE_METERS)
    const materials = new Map<string, THREE.MeshBasicMaterial>()
    buildTileMap().forEach((rowTiles, row) => {
      rowTiles.forEach((tile, column) => {
        const key = `${tile.kind}:${tile.quarterTurns}`
        let material = materials.get(key)
        if (material === undefined) {
          const texture = new THREE.CanvasTexture(renderTileImage(tile, textures))
          texture.colorSpace = THREE.SRGBColorSpace
          material = new THREE.MeshBasicMaterial({ map: texture })
          materials.set(key, material)
        }
        const mesh = new THREE.Mesh(geometry, material)
        mesh.position.set((column - RUNWAY_FIRST_COLUMN + 0.5) * TILE_SIZE_METERS, (RUNWAY_ROW - row) * TILE_SIZE_METERS, 0)
        this.object.add(mesh)
      })
    })
  }
}
