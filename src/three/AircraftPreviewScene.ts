import * as THREE from 'three'
import { D520Model } from './D520Model'
import { LiveryTextures } from './liveries'
import { OrbitViewScene } from './OrbitViewScene'
import type { OrbitView } from './OrbitViewScene'
import { ParkingPad } from './ParkingPad'
import { Sky } from './Sky'

/** On the ground: seen from above on its parking pad among bushes, turned by dragging. In flight: seen from the side, nose to the right, in a sky. */
export type PreviewMode = 'ground' | 'flight'

// Straight above the aircraft, a little toward its tail, so that its nose points up the picture; dragging turns it from there.
const GROUND_VIEW: OrbitView = {
  cameraStart: new THREE.Vector3(0, -0.5, 28),
  target: new THREE.Vector3(0, 0, 0),
  farMeters: 100,
  isDraggable: true,
}
// On the right side of the aircraft (+x) looking toward -x, with +z up: the nose (+y) points to the right of the picture.
const FLIGHT_VIEW: OrbitView = {
  cameraStart: new THREE.Vector3(17, 0, 0.6),
  target: new THREE.Vector3(0, 0, 0.1),
  farMeters: 600,
  isDraggable: false,
}
// The flight speed given to the aircraft, nose first, so that its smoke trails behind it.
const FLIGHT_VELOCITY = new THREE.Vector3(0, 10, 0)

/** Starts loading the liveries and puts the French one on the aircraft when it arrives; `loaded` settles then. */
function loadFrenchLivery(maxAnisotropy: number, aircraft: D520Model): { liveries: LiveryTextures; loaded: Promise<void> } {
  let liveries!: LiveryTextures
  const loaded = new Promise<void>((resolve) => {
    liveries = new LiveryTextures(maxAnisotropy, (livery, texture) => {
      if (livery === 'french') {
        aircraft.setLivery(texture)
        resolve()
      }
    })
  })
  return { liveries, loaded }
}

/** One D.520 of the hangar on its own: on the ground, on terrain among bushes, to turn about, or in flight in a sky, with the damage it really has. */
export class AircraftPreviewScene extends OrbitViewScene {
  private readonly aircraft = new D520Model()
  private readonly liveries: LiveryTextures
  private readonly sky: Sky | undefined

  constructor(container: HTMLElement, mode: PreviewMode, damageLevel: number) {
    super(container, mode === 'flight' ? FLIGHT_VIEW : GROUND_VIEW)
    const { liveries, loaded: frenchLiveryLoaded } = loadFrenchLivery(this.renderer.capabilities.getMaxAnisotropy(), this.aircraft)
    this.liveries = liveries
    this.scene.add(this.aircraft.object)
    if (mode === 'ground') {
      this.scene.add(new ParkingPad().object)
    }
    if (mode === 'flight') {
      this.sky = new Sky()
      this.scene.add(this.sky.object)
      this.aircraft.setVelocity(FLIGHT_VELOCITY)
      this.aircraft.setControl('retractGear', true)
      this.aircraft.setControl('runEngine', true)
    }
    void Promise.all([this.aircraft.ready, frenchLiveryLoaded]).then(() => this.showDamage(damageLevel))
  }

  dispose(): void {
    super.dispose()
    this.liveries.dispose()
  }

  protected advance(deltaSeconds: number): void {
    this.aircraft.update(deltaSeconds)
    this.sky?.update(deltaSeconds)
  }

  private showDamage(level: number): void {
    for (let step = 0; step < level; step += 1) {
      this.aircraft.inflictDamage()
    }
  }
}
