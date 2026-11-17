import * as THREE from 'three'
import { D520Model } from './D520Model'
import type { AircraftControl } from './D520Model'
import { LiveryTextures } from './liveries'
import type { Livery } from './liveries'
import { OrbitViewScene } from './OrbitViewScene'
import type { OrbitView } from './OrbitViewScene'

const AIRCRAFT_VIEW: OrbitView = {
  cameraStart: new THREE.Vector3(-8, 9, 6),
  target: new THREE.Vector3(0, 0, -0.2),
  farMeters: 100,
}

// The flight speed given to the aircraft on show, nose first, so that its smoke trails behind it.
const AIRCRAFT_VELOCITY = new THREE.Vector3(0, 10, 0)

/** The D.520 alone on a clear background, turned in every direction by dragging, with its animations. */
export class ModelViewerScene extends OrbitViewScene {
  private readonly aircraft = new D520Model()
  private readonly liveries: LiveryTextures
  private livery: Livery = 'french'

  constructor(container: HTMLElement) {
    super(container, AIRCRAFT_VIEW)
    this.liveries = new LiveryTextures(this.renderer.capabilities.getMaxAnisotropy(), (livery, texture) => {
      if (livery === this.livery) {
        this.aircraft.setLivery(texture)
      }
    })
    this.scene.add(this.aircraft.object)
    this.aircraft.setVelocity(AIRCRAFT_VELOCITY)
  }

  setLivery(livery: Livery): void {
    this.livery = livery
    const texture = this.liveries.get(livery)
    if (texture !== undefined) {
      this.aircraft.setLivery(texture)
    }
  }

  setControl(control: AircraftControl, isActive: boolean): void {
    this.aircraft.setControl(control, isActive)
  }

  inflictDamage(): number {
    return this.aircraft.inflictDamage()
  }

  repair(): void {
    this.aircraft.repair()
  }

  dispose(): void {
    super.dispose()
    this.liveries.dispose()
  }

  protected advance(deltaSeconds: number): void {
    this.aircraft.update(deltaSeconds)
  }
}
