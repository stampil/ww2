import * as THREE from 'three'
import type { AircraftModel3D } from './aircraftModel'
import { createAircraftModel } from './aircraftModels'
import { LiveryTextures } from './liveries'
import type { Livery } from './liveries'
import { OrbitViewScene } from './OrbitViewScene'
import type { OrbitView } from './OrbitViewScene'
import { ParkingPad } from './ParkingPad'
import { HORIZON_COLOR, OVERHEAD_SKY, Sky } from './Sky'

// Straight above the aircraft, a little toward its tail, so that its nose points up the picture; dragging turns it from there,
// down to the horizon but never below the terrain.
const GROUND_VIEW: OrbitView = {
  cameraStart: new THREE.Vector3(0, -0.5, 28),
  target: new THREE.Vector3(0, 0, 0),
  farMeters: 600,
  isDraggable: true,
  maxPolarAngleDegrees: 85,
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

/** One aircraft of the hangar on its own, seen from above on its parking pad among a few bushes under a sky, turned by dragging, with the damage it really has. */
export class AircraftPreviewScene extends OrbitViewScene {
  /** Settles once the aircraft, its livery, its damage and its pad are all drawn. */
  readonly ready: Promise<void>
  private readonly aircraft: AircraftModel3D
  private readonly liveries: LiveryTextures
  private readonly sky: Sky

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
  }

  dispose(): void {
    super.dispose()
    this.liveries.dispose()
  }

  protected advance(deltaSeconds: number): void {
    this.aircraft.update(deltaSeconds)
    this.sky.update(deltaSeconds)
  }

  private showDamage(level: number): void {
    for (let step = 0; step < level; step += 1) {
      this.aircraft.inflictDamage()
    }
  }
}
