import * as THREE from 'three'
import { assetUrl } from '../assetUrl'
import { Bushes } from './Bushes'
import type { BushPlacement } from './Bushes'
import { D520_GROUND_PITCH_RADIANS, d520AxisHeightOnGround } from './D520Model'
import { SeededRandom } from './SeededRandom'

const GRASS_URL = assetUrl('textures/herbe.png')
const CONCRETE_URL = assetUrl('textures/beton.png')
const GRASS_COLOR_UNTIL_LOADED = 0x6d7231
const CONCRETE_COLOR_UNTIL_LOADED = 0x9a9a92
const GRASS_SIZE_METERS = 600
const GRASS_TILE_METERS = 8
const PAD_WIDTH_METERS = 13
const PAD_LENGTH_METERS = 12
const CONCRETE_TILE_METERS = 5
const PAD_LIFT_METERS = 0.02
const BUSH_MIN_COUNT = 1
const BUSH_MAX_COUNT = 3
const BUSH_RING_HALF_WIDTH_METERS = 8.6
const BUSH_RING_HALF_LENGTH_METERS = 7.8
const BUSH_JITTER_METERS = 0.9
const BUSH_MIN_WIDTH_METERS = 2.2
const BUSH_WIDTH_RANGE_METERS = 1.2
const RANDOM_RESOLUTION = 1000
const FULL_TURN_RADIANS = 2 * Math.PI

/** A flat rectangle of a terrain texture, repeated to fill it, in the color of that terrain until the picture is loaded. */
function texturedPlane(url: string, colorUntilLoaded: number, widthMeters: number, lengthMeters: number, tileMeters: number): THREE.Mesh {
  const material = new THREE.MeshBasicMaterial({ color: colorUntilLoaded, side: THREE.DoubleSide })
  new THREE.TextureLoader().load(url, (texture) => {
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(widthMeters / tileMeters, lengthMeters / tileMeters)
    texture.colorSpace = THREE.SRGBColorSpace
    material.map = texture
    material.color.set(0xffffff)
    material.needsUpdate = true
  })
  return new THREE.Mesh(new THREE.PlaneGeometry(widthMeters, lengthMeters), material)
}

/** A number from -1 up to 1 drawn from the seeded random. */
function signedFractionOf(random: SeededRandom): number {
  return random.integer(-RANDOM_RESOLUTION, RANDOM_RESOLUTION) / RANDOM_RESOLUTION
}

/** From one to three bushes around the pad, each at a place of the ring drawn at random, a little off it, and of its own size and way. */
function scatteredBushes(layoutSeed: number): BushPlacement[] {
  const random = new SeededRandom(layoutSeed)
  const bushCount = random.integer(BUSH_MIN_COUNT, BUSH_MAX_COUNT)
  const placements: BushPlacement[] = []
  for (let index = 0; index < bushCount; index += 1) {
    const angle = ((signedFractionOf(random) + 1) / 2) * FULL_TURN_RADIANS
    placements.push({
      x: Math.cos(angle) * BUSH_RING_HALF_WIDTH_METERS + signedFractionOf(random) * BUSH_JITTER_METERS,
      y: Math.sin(angle) * BUSH_RING_HALF_LENGTH_METERS + signedFractionOf(random) * BUSH_JITTER_METERS,
      widthMeters: BUSH_MIN_WIDTH_METERS + ((signedFractionOf(random) + 1) / 2) * BUSH_WIDTH_RANGE_METERS,
      turnRadians: ((signedFractionOf(random) + 1) / 2) * FULL_TURN_RADIANS,
    })
  }
  return placements
}

/** The ground an aircraft of the hangar stands on: the grass and the concrete of the terrain, with a few bushes of the game around it, placed by the seed. */
export class ParkingPad {
  readonly object = new THREE.Group()

  constructor(layoutSeed: number) {
    this.object.position.z = -d520AxisHeightOnGround(D520_GROUND_PITCH_RADIANS)
    this.object.add(texturedPlane(GRASS_URL, GRASS_COLOR_UNTIL_LOADED, GRASS_SIZE_METERS, GRASS_SIZE_METERS, GRASS_TILE_METERS))
    const pad = texturedPlane(CONCRETE_URL, CONCRETE_COLOR_UNTIL_LOADED, PAD_WIDTH_METERS, PAD_LENGTH_METERS, CONCRETE_TILE_METERS)
    pad.position.z = PAD_LIFT_METERS
    this.object.add(pad)
    this.object.add(new Bushes(scatteredBushes(layoutSeed)).object)
  }
}
