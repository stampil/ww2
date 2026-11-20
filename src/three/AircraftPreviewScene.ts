import * as THREE from 'three'
import { D520_GROUND_PITCH_RADIANS, D520Model } from './D520Model'
import { LiveryTextures } from './liveries'
import type { Livery } from './liveries'
import { OrbitViewScene } from './OrbitViewScene'
import type { OrbitView } from './OrbitViewScene'
import { ParkingPad } from './ParkingPad'
import { FLIGHT_SKY, HORIZON_COLOR, OVERHEAD_SKY, Sky } from './Sky'

/** On the ground: seen from above on its parking pad among bushes, turned by dragging. In flight: seen from the side, nose to the right, in a sky. */
export type PreviewMode = 'ground' | 'flight'

// Straight above the aircraft, a little toward its tail, so that its nose points up the picture; dragging turns it from there,
// down to the horizon but never below the terrain.
const GROUND_VIEW: OrbitView = {
  cameraStart: new THREE.Vector3(0, -0.5, 28),
  target: new THREE.Vector3(0, 0, 0),
  farMeters: 600,
  isDraggable: true,
  maxPolarAngleDegrees: 85,
}
// The terrain fades into the haze of the horizon between these distances from the camera, before it ends.
const HAZE_NEAR_METERS = 80
const HAZE_FAR_METERS = 260
// On the right side of the aircraft (+x) looking toward -x, with +z up: the nose (+y) points to the right of the picture.
const FLIGHT_VIEW: OrbitView = {
  cameraStart: new THREE.Vector3(17, 0, 0.6),
  target: new THREE.Vector3(0, 0, 0.1),
  farMeters: 600,
  isDraggable: false,
}
// The flight speed given to the aircraft, nose first, so that its smoke trails behind it.
const FLIGHT_VELOCITY = new THREE.Vector3(0, 10, 0)

/** Starts loading the livery of the aircraft and puts it on the aircraft when it arrives; `loaded` settles then. */
function loadLivery(maxAnisotropy: number, aircraft: D520Model, wornLivery: Livery): { liveries: LiveryTextures; loaded: Promise<void> } {
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

/** One D.520 of the hangar on its own: on the ground, on terrain among a few bushes placed by `layoutSeed`, under a sky, to turn about, or in flight in a sky, with the damage it really has. */
export class AircraftPreviewScene extends OrbitViewScene {
  private readonly aircraft = new D520Model()
  private readonly liveries: LiveryTextures
  private readonly sky: Sky

  constructor(container: HTMLElement, mode: PreviewMode, damageLevel: number, layoutSeed: number, tailNumber: number, livery: Livery) {
    super(container, mode === 'flight' ? FLIGHT_VIEW : GROUND_VIEW)
    const { liveries, loaded: liveryLoaded } = loadLivery(this.renderer.capabilities.getMaxAnisotropy(), this.aircraft, livery)
    this.liveries = liveries
    this.aircraft.setTailNumber(tailNumber)
    this.scene.add(this.aircraft.object)
    this.sky = new Sky(mode === 'flight' ? FLIGHT_SKY : OVERHEAD_SKY)
    this.scene.add(this.sky.object)
    if (mode === 'ground') {
      this.aircraft.object.rotation.x = D520_GROUND_PITCH_RADIANS
      this.scene.add(new ParkingPad(layoutSeed).object)
      this.scene.fog = new THREE.Fog(HORIZON_COLOR, HAZE_NEAR_METERS, HAZE_FAR_METERS)
    }
    if (mode === 'flight') {
      this.aircraft.setVelocity(FLIGHT_VELOCITY)
      this.aircraft.setControl('retractGear', true)
      this.aircraft.setControl('runEngine', true)
    }
    void Promise.all([this.aircraft.ready, liveryLoaded]).then(() => this.showDamage(damageLevel))
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
