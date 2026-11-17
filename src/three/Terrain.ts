import * as THREE from 'three'
import { TILE_SIZE_METERS } from './airfield'
import { Bushes } from './Bushes'
import type { BushPlacement } from './Bushes'
import { renderTileImage, TILE_IMAGE_PIXELS } from './tileImages'
import { loadTerrainTextures } from './terrainTextures'
import { BUSHES } from './tiles'
import type { Tile } from './tiles'

const TERRAIN_URL = '/api/terrain'
const GROUND_CELLS = 200
const GROUND_DEPTH_METERS = 0.1
const BUSH_TURN_STEP_RADIANS = 2.4

type Runway = { row: number; firstColumn: number; length: number }
/** What the API sends for a seed: the runway and the tiles, rows from the north and columns from the west. */
type TerrainMap = { columns: number; runway: Runway; tiles: Tile[][] }

/** The world has its origin on the left end of the runway, at the middle of its row; x grows to the east, y to the north. */
function tileCenter(runway: Runway, row: number, column: number): THREE.Vector2 {
  return new THREE.Vector2((column - runway.firstColumn + 0.5) * TILE_SIZE_METERS, (runway.row - row) * TILE_SIZE_METERS)
}

/** One 3D bush on every spot where the bushes tile paints one, as wide as the painted one, turned differently each time. */
function bushesOnTile(center: THREE.Vector2, tileNumber: number): BushPlacement[] {
  return BUSHES.map((bush, index) => ({
    x: center.x + (bush.x - 0.5) * TILE_SIZE_METERS,
    y: center.y + (0.5 - bush.y) * TILE_SIZE_METERS,
    widthMeters: 2 * bush.radius * TILE_SIZE_METERS,
    turnRadians: (tileNumber + index) * BUSH_TURN_STEP_RADIANS,
  }))
}

/**
 * The ground: the map of 2D tiles that the API makes for a seed, one textured square each, so any tile can be moved or
 * turned, on a vast grass plain.
 */
export class Terrain {
  readonly object = new THREE.Group()
  /** The length of the runway in meters, known once the terrain has come from the API. */
  readonly runwayLengthMeters: Promise<number>

  constructor(
    private readonly seed: number,
    private readonly maxAnisotropy: number,
  ) {
    this.runwayLengthMeters = this.build()
  }

  private async build(): Promise<number> {
    const textures = await loadTerrainTextures()
    this.addGrassPlain(textures.grass)
    const response = await fetch(`${TERRAIN_URL}?seed=${this.seed}`)
    const map = (await response.json()) as TerrainMap
    const geometry = new THREE.PlaneGeometry(TILE_SIZE_METERS, TILE_SIZE_METERS)
    const materials = new Map<string, THREE.MeshBasicMaterial>()
    const bushPlacements: BushPlacement[] = []
    map.tiles.forEach((rowTiles, row) => {
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
        const center = tileCenter(map.runway, row, column)
        mesh.position.set(center.x, center.y, 0)
        this.object.add(mesh)
        if (tile.kind === 'bushes') {
          bushPlacements.push(...bushesOnTile(center, row * map.columns + column))
        }
      })
    })
    this.object.add(new Bushes(bushPlacements).object)
    return map.runway.length * TILE_SIZE_METERS
  }

  /** The grass texture repeated far past the tiles, in step with the grass of the tiles, so the ground never ends. */
  private addGrassPlain(grass: HTMLImageElement): void {
    const cellMeters = (TILE_SIZE_METERS * grass.width) / TILE_IMAGE_PIXELS
    const texture = new THREE.Texture(grass)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(GROUND_CELLS, GROUND_CELLS)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = this.maxAnisotropy
    texture.needsUpdate = true
    const sizeMeters = cellMeters * GROUND_CELLS
    const plain = new THREE.Mesh(new THREE.PlaneGeometry(sizeMeters, sizeMeters), new THREE.MeshBasicMaterial({ map: texture }))
    plain.position.z = -GROUND_DEPTH_METERS
    this.object.add(plain)
  }
}
