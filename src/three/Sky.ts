import * as THREE from 'three'
import { SeededRandom } from './SeededRandom'

const DOME_RADIUS_METERS = 250
const DOME_SEGMENTS = 32
const ZENITH_COLOR = new THREE.Color(0x2f6fc4)
export const HORIZON_COLOR = new THREE.Color(0xbfdcf5)
const PUFFS_PER_CLOUD = 7
const CLOUD_SEED = 1940
const CLOUD_COLOR = 0xffffff
const CLOUD_OPACITY = 0.95
const PUFF_RADIUS_METERS = 2.2
const PUFF_SPREAD_METERS = 3.2
const CLOUD_SPEED_RANGE_METERS_PER_SECOND = { from: 6, to: 12 }
const OTHER_SIDE_PERCENT = 50
const FLATTEN = 0.55

const RANDOM_RESOLUTION = 10000

type Cloud = { object: THREE.Group; speed: number }
type Range = { from: number; to: number }

/** How many clouds a sky has, how large they are, and where: depth along x (on both sides when `isMirrored`), height along z, and how far along y they go before they come back. */
export type SkyLayout = {
  cloudCount: number
  cloudScale: number
  depthRangeMeters: Range
  isMirrored: boolean
  heightRangeMeters: Range
  wrapHalfLengthMeters: number
}

/** Many small clouds going by on one side of an aircraft in flight. */
export const FLIGHT_SKY: SkyLayout = {
  cloudCount: 16,
  cloudScale: 1,
  depthRangeMeters: { from: -90, to: -8 },
  isMirrored: false,
  heightRangeMeters: { from: -10, to: 14 },
  wrapHalfLengthMeters: 90,
}

/** A few large clouds low on the horizon, on both sides of an aircraft on the ground and far from it, so that none comes between it and its camera. */
export const OVERHEAD_SKY: SkyLayout = {
  cloudCount: 6,
  cloudScale: 5,
  depthRangeMeters: { from: 150, to: 230 },
  isMirrored: true,
  heightRangeMeters: { from: 15, to: 40 },
  wrapHalfLengthMeters: 230,
}

/** A number from 0 up to 1 drawn from the seeded random. */
function fractionOf(random: SeededRandom): number {
  return random.integer(0, RANDOM_RESOLUTION) / RANDOM_RESOLUTION
}

/**
 * A sky in three dimensions: a dome from deep blue to a pale horizon, with clouds made of soft puffs at different depths that drift
 * toward the tail of an aircraft flying nose along +y, so that they go by with the perspective of a real flight.
 */
export class Sky {
  readonly object = new THREE.Group()
  private readonly clouds: Cloud[] = []

  constructor(private readonly layout: SkyLayout) {
    this.object.add(this.dome())
    const random = new SeededRandom(CLOUD_SEED)
    const puff = new THREE.IcosahedronGeometry(PUFF_RADIUS_METERS, 2)
    const material = new THREE.MeshStandardMaterial({ color: CLOUD_COLOR, roughness: 1, transparent: true, opacity: CLOUD_OPACITY, fog: false })
    for (let index = 0; index < this.layout.cloudCount; index += 1) {
      const cloud = new THREE.Group()
      for (let place = 0; place < PUFFS_PER_CLOUD; place += 1) {
        const mesh = new THREE.Mesh(puff, material)
        mesh.position.set((fractionOf(random) - 0.5) * PUFF_SPREAD_METERS, (fractionOf(random) - 0.5) * PUFF_SPREAD_METERS * 2, (fractionOf(random) - 0.5) * PUFF_SPREAD_METERS * FLATTEN)
        mesh.scale.setScalar(0.6 + fractionOf(random) * 0.8)
        cloud.add(mesh)
      }
      cloud.scale.setScalar(this.layout.cloudScale)
      cloud.position.set(
        this.cloudDepth(random),
        (fractionOf(random) * 2 - 1) * this.layout.wrapHalfLengthMeters,
        this.between(random, this.layout.heightRangeMeters),
      )
      this.clouds.push({ object: cloud, speed: this.between(random, CLOUD_SPEED_RANGE_METERS_PER_SECOND) })
      this.object.add(cloud)
    }
  }

  /** Moves every cloud on toward the tail, and brings back at the front the ones that have gone past the edge. */
  update(deltaSeconds: number): void {
    for (const cloud of this.clouds) {
      cloud.object.position.y -= cloud.speed * deltaSeconds
      if (cloud.object.position.y < -this.layout.wrapHalfLengthMeters) {
        cloud.object.position.y += 2 * this.layout.wrapHalfLengthMeters
      }
    }
  }

  private cloudDepth(random: SeededRandom): number {
    const depth = this.between(random, this.layout.depthRangeMeters)
    if (this.layout.isMirrored && random.happens(OTHER_SIDE_PERCENT)) {
      return -depth
    }
    return depth
  }

  private between(random: SeededRandom, range: Range): number {
    return range.from + fractionOf(random) * (range.to - range.from)
  }

  /** The inside of a sphere painted from the horizon (pale) up to the zenith (deep blue), above and below. */
  private dome(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(DOME_RADIUS_METERS, DOME_SEGMENTS, DOME_SEGMENTS)
    const positions = geometry.getAttribute('position')
    const colors: number[] = []
    const color = new THREE.Color()
    for (let index = 0; index < positions.count; index += 1) {
      const heightShare = Math.abs(positions.getZ(index)) / DOME_RADIUS_METERS
      color.copy(HORIZON_COLOR).lerp(ZENITH_COLOR, heightShare)
      colors.push(color.r, color.g, color.b)
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    return new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, depthWrite: false, fog: false }))
  }
}
