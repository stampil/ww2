import * as THREE from 'three'
import type { AircraftModel3D } from './aircraftModel'
import { createAircraftModel } from './aircraftModels'
import { inspectionTourAt } from './inspectionTour'
import type { CameraBearing } from './inspectionTour'
import { LiveryTextures } from './liveries'
import type { Livery } from './liveries'
import { OrbitViewScene } from './OrbitViewScene'
import type { OrbitView } from './OrbitViewScene'
import { ParkingPad } from './ParkingPad'
import { HORIZON_COLOR, OVERHEAD_SKY, Sky } from './Sky'

// The lowest the camera goes, nearly level with the horizon but never below the terrain: where dragging stops, and where the tour comes down to.
const LOWEST_VIEW_DEGREES = 85
// Seen from its right, an aircraft whose nose points up the picture shows its profile with the nose to the right.
const RIGHT_SIDE_AZIMUTH_RADIANS = 0
// Straight above the aircraft, a little toward its tail, so that its nose points up the picture; dragging turns it from there,
// down to the horizon but never below the terrain.
const GROUND_VIEW: OrbitView = {
  cameraStart: new THREE.Vector3(0, -0.5, 28),
  target: new THREE.Vector3(0, 0, 0),
  farMeters: 600,
  isDraggable: true,
  maxPolarAngleDegrees: LOWEST_VIEW_DEGREES,
  zoomRangeMeters: { min: 10, max: 45 },
}
// The terrain fades into the haze of the horizon between these distances from the camera, before it ends.
const HAZE_NEAR_METERS = 80
const HAZE_FAR_METERS = 260
// Every pad has its bushes in the same places, so that this scene starts as the picture of the card it replaces.
const PAD_LAYOUT_SEED = 1940

/** Starts loading the livery of the aircraft and puts it on the aircraft when it arrives; `loaded` settles then. */
export function loadLivery(maxAnisotropy: number, aircraft: AircraftModel3D, wornLivery: Livery): { liveries: LiveryTextures; loaded: Promise<void> } {
  let liveries!: LiveryTextures
  const loaded = new Promise<void>((resolve) => {
    liveries = new LiveryTextures(
      maxAnisotropy,
      (loaded, texture) => {
        if (loaded === wornLivery) {
          aircraft.setLivery(texture)
          resolve()
        }
      },
      'full',
      [wornLivery],
    )
  })
  return { liveries, loaded }
}

/** One aircraft of the hangar on its own, seen from above on its parking pad among a few bushes under a sky, with the damage it really has: its tour first, then turned by dragging. */
export class AircraftPreviewScene extends OrbitViewScene {
  /** Settles once the aircraft, its livery, its damage and its pad are all drawn. */
  readonly ready: Promise<void>
  private readonly aircraft: AircraftModel3D
  private readonly liveries: LiveryTextures
  private readonly sky: Sky
  private readonly tourStart: CameraBearing
  private readonly tourProfile: CameraBearing
  private readonly tourDistanceMeters: number
  // The seconds the tour has run, null when none is under way.
  private tourSeconds: number | null = null
  private readonly endTourOnTouch = (): void => {
    if (this.tourSeconds !== null) {
      this.endTour()
    }
  }

  constructor(container: HTMLElement, damageLevel: number, tailNumber: number, livery: Livery) {
    super(container, GROUND_VIEW)
    this.aircraft = createAircraftModel(livery)
    const { liveries, loaded: liveryLoaded } = loadLivery(this.renderer.capabilities.getMaxAnisotropy(), this.aircraft, livery)
    this.liveries = liveries
    this.aircraft.setTailNumber(tailNumber)
    this.scene.add(this.aircraft.object)
    this.sky = new Sky(OVERHEAD_SKY)
    this.scene.add(this.sky.object)
    this.aircraft.object.rotation.x = this.aircraft.groundPitchRadians
    const pad = new ParkingPad(PAD_LAYOUT_SEED, this.aircraft.axisHeightOnGround(this.aircraft.groundPitchRadians))
    this.scene.add(pad.object)
    this.scene.fog = new THREE.Fog(HORIZON_COLOR, HAZE_NEAR_METERS, HAZE_FAR_METERS)
    this.ready = Promise.all([this.aircraft.ready, liveryLoaded, pad.ready]).then(() => this.showDamage(damageLevel))
    const offset = GROUND_VIEW.cameraStart.clone().sub(GROUND_VIEW.target)
    this.tourDistanceMeters = offset.length()
    this.tourStart = { polarRadians: Math.acos(offset.z / this.tourDistanceMeters), azimuthRadians: Math.atan2(offset.y, offset.x) }
    this.tourProfile = { polarRadians: THREE.MathUtils.degToRad(LOWEST_VIEW_DEGREES), azimuthRadians: RIGHT_SIDE_AZIMUTH_RADIANS }
    // In the capture phase, so that the same touch goes on to drag the view once the player has it back.
    container.addEventListener('pointerdown', this.endTourOnTouch, { capture: true })
  }

  /** Sends the camera down to the profile and once round the aircraft, out of the player's hands until it is done or the player touches the view. */
  startTour(): void {
    this.tourSeconds = 0
    this.controls.enabled = false
  }

  dispose(): void {
    this.container.removeEventListener('pointerdown', this.endTourOnTouch, { capture: true })
    super.dispose()
    this.liveries.dispose()
  }

  protected advance(deltaSeconds: number): void {
    this.aircraft.update(deltaSeconds)
    this.sky.update(deltaSeconds)
    if (this.tourSeconds !== null) {
      this.tourSeconds += deltaSeconds
      const { bearing, isOver } = inspectionTourAt(this.tourSeconds, this.tourStart, this.tourProfile)
      this.placeCamera(bearing)
      if (isOver) {
        this.endTour()
      }
    }
  }

  /** Gives the camera back to the player where the tour has left it. */
  private endTour(): void {
    this.tourSeconds = null
    this.controls.enabled = true
  }

  private placeCamera(bearing: CameraBearing): void {
    const horizontalMeters = this.tourDistanceMeters * Math.sin(bearing.polarRadians)
    this.camera.position
      .set(horizontalMeters * Math.cos(bearing.azimuthRadians), horizontalMeters * Math.sin(bearing.azimuthRadians), this.tourDistanceMeters * Math.cos(bearing.polarRadians))
      .add(GROUND_VIEW.target)
  }

  private showDamage(level: number): void {
    for (let step = 0; step < level; step += 1) {
      this.aircraft.inflictDamage()
    }
  }
}
