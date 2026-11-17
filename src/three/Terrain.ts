import * as THREE from 'three'
import { TILE_SIZE_METERS } from './airfield'
import { TerrainGenerator } from './TerrainGenerator'
import { TileGround, tileCenterOf } from './TileGround'

/** The ground of the proof of concept: the map of 2D tiles that the generator makes for a seed, on a vast grass plain. */
export class Terrain {
  readonly object: THREE.Group
  /** The length of the runway in meters, known once the terrain textures have loaded. */
  readonly runwayLengthMeters: Promise<number>

  constructor(seed: number, maxAnisotropy: number) {
    const map = new TerrainGenerator().generate(seed)
    const ground = new TileGround(map.tiles, (row, column) => tileCenterOf(map.runway, row, column), maxAnisotropy)
    this.object = ground.object
    this.runwayLengthMeters = ground.ready.then(() => map.runway.length * TILE_SIZE_METERS)
  }
}
