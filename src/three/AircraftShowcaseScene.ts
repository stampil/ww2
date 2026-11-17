import * as THREE from 'three'
import { OrbitViewScene } from './OrbitViewScene'
import type { OrbitView } from './OrbitViewScene'
import { loadStaticAircraft } from './StaticAircraft'

const SHOWCASE_VIEW: OrbitView = {
  cameraStart: new THREE.Vector3(1, 1.2, 0.7),
  target: new THREE.Vector3(0, 0, 0),
  farMeters: 300,
  isDraggable: true,
}

/** One aircraft of the game, as tools/convert-ac3d.py wrote it into public/models/<id>/, turned in every direction by dragging. */
export class AircraftShowcaseScene extends OrbitViewScene {
  private isDisposed = false

  constructor(container: HTMLElement, aircraftId: string) {
    super(container, SHOWCASE_VIEW)
    void this.load(aircraftId)
  }

  dispose(): void {
    this.isDisposed = true
    super.dispose()
  }

  protected advance(): void {
    // The aircraft does not move: only dragging turns it.
  }

  private async load(aircraftId: string): Promise<void> {
    const aircraft = await loadStaticAircraft(aircraftId)
    if (this.isDisposed) {
      return
    }
    this.scene.add(aircraft)

    const bounds = new THREE.Box3().setFromObject(aircraft)
    const sphere = bounds.getBoundingSphere(new THREE.Sphere())
    this.frame(sphere.center, sphere.radius)
  }
}
