import * as THREE from 'three'
import type { AircraftModel3D } from './aircraftModel'
import { loadLivery } from './AircraftPreviewScene'
import { createAircraftModel } from './aircraftModels'
import { Bushes } from './Bushes'
import type { BushPlacement } from './Bushes'
import { DESTROYED_LEVEL } from './damageStages'
import type { LiveryTextures } from './liveries'
import type { Livery } from './liveries'
import { OrbitViewScene } from './OrbitViewScene'
import type { OrbitView } from './OrbitViewScene'
import { grassGround } from './ParkingPad'
import { SeededRandom } from './SeededRandom'
import { HORIZON_COLOR, OVERHEAD_SKY, Sky } from './Sky'

// The camera stands on the right of the line the aircraft falls along (+y, nose first), so that it crosses the picture from left to right.
const CRASH_VIEW: OrbitView = {
  cameraStart: new THREE.Vector3(80, -30, 14),
  target: new THREE.Vector3(0, -30, 10),
  farMeters: 600,
  isDraggable: false,
}
const HAZE_NEAR_METERS = 120
const HAZE_FAR_METERS = 320
// The aircraft comes down from this height and from this far, in this long, burning, then hits the ground and blows up.
const START_ALTITUDE_METERS = 38
const START_DISTANCE_METERS = 60
const FALL_SECONDS = 2.8
const FALL_SPEED_METERS_PER_SECOND = 40
const FIRST_DIVE_RADIANS = 0.2
const LAST_DIVE_RADIANS = 0.5
const ROLL_RADIANS = 2.4
// How burnt it is while it falls: the level of damage where it smokes and burns, two short of the one that blows it up.
const BURNING_LEVEL = DESTROYED_LEVEL - 2
const SCRUB_BUSHES = 14
const SCRUB_HALF_WIDTH_METERS = 70
const SCRUB_LENGTH_METERS = 110
const SCRUB_FIRST_Y_METERS = -75
const SCRUB_CLEAR_CORRIDOR_METERS = 9
const SCRUB_MIN_WIDTH_METERS = 2.2
const SCRUB_WIDTH_RANGE = 3
const SCRUB_SEED = 1940
const FULL_TURN_RADIANS = 2 * Math.PI
const DEGREES_PER_TURN = 360

/** A few bushes scattered over the field, none on the line the aircraft falls along. */
function scrub(): BushPlacement[] {
  const random = new SeededRandom(SCRUB_SEED)
  const placements: BushPlacement[] = []
  while (placements.length < SCRUB_BUSHES) {
    const x = random.integer(-SCRUB_HALF_WIDTH_METERS, SCRUB_HALF_WIDTH_METERS)
    if (Math.abs(x) > SCRUB_CLEAR_CORRIDOR_METERS) {
      placements.push({
        x,
        y: SCRUB_FIRST_Y_METERS + random.integer(0, SCRUB_LENGTH_METERS),
        widthMeters: SCRUB_MIN_WIDTH_METERS + random.integer(0, SCRUB_WIDTH_RANGE),
        turnRadians: random.integer(0, DEGREES_PER_TURN) * (FULL_TURN_RADIANS / DEGREES_PER_TURN),
      })
    }
  }
  return placements
}

/**
 * An aircraft that does not come back, on open grass with no camp in sight: it comes down in flames, smoking behind it, hits the ground and blows up. Owns its WebGL canvas.
 */
export class CrashScene extends OrbitViewScene {
  private readonly aircraft: AircraftModel3D
  private readonly liveries: LiveryTextures
  private readonly sky = new Sky(OVERHEAD_SKY)
  private readonly restHeightMeters: number
  private isFalling = false
  private fallenSeconds = 0

  constructor(container: HTMLElement, livery: Livery) {
    super(container, CRASH_VIEW)
    this.aircraft = createAircraftModel(livery)
    const { liveries, loaded: liveryLoaded } = loadLivery(this.renderer.capabilities.getMaxAnisotropy(), this.aircraft, livery)
    this.liveries = liveries
    this.restHeightMeters = this.aircraft.axisHeightOnGround(0)
    this.scene.add(this.sky.object, this.aircraft.object)
    const grass = grassGround()
    grass.mesh.position.z = -this.restHeightMeters
    const bushes = new Bushes(scrub())
    bushes.object.position.z = -this.restHeightMeters
    this.scene.add(grass.mesh, bushes.object)
    this.scene.fog = new THREE.Fog(HORIZON_COLOR, HAZE_NEAR_METERS, HAZE_FAR_METERS)
    this.aircraft.setVelocity(new THREE.Vector3(0, FALL_SPEED_METERS_PER_SECOND, 0))
    this.place(0)
    void Promise.all([this.aircraft.ready, liveryLoaded, grass.loaded, bushes.ready]).then(() => this.startFalling())
  }

  dispose(): void {
    super.dispose()
    this.liveries.dispose()
  }

  protected advance(deltaSeconds: number): void {
    this.aircraft.update(deltaSeconds)
    this.sky.update(deltaSeconds)
    if (!this.isFalling) {
      return
    }
    this.fallenSeconds += deltaSeconds
    const progress = Math.min(1, this.fallenSeconds / FALL_SECONDS)
    this.place(progress)
    if (progress === 1) {
      this.isFalling = false
      this.aircraft.inflictDamage()
      this.aircraft.inflictDamage()
    }
  }

  private startFalling(): void {
    for (let level = 0; level < BURNING_LEVEL; level += 1) {
      this.aircraft.inflictDamage()
    }
    this.isFalling = true
  }

  /** Puts the aircraft on its way down: `progress` is how far it has fallen, from 0 where it starts to 1 where it hits the ground. */
  private place(progress: number): void {
    const remaining = 1 - progress
    this.aircraft.object.position.set(0, -START_DISTANCE_METERS * remaining, this.restHeightMeters + START_ALTITUDE_METERS * remaining * remaining)
    this.aircraft.object.rotation.set(-(FIRST_DIVE_RADIANS + (LAST_DIVE_RADIANS - FIRST_DIVE_RADIANS) * progress), ROLL_RADIANS * progress, 0)
  }
}
