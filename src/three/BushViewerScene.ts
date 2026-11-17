import * as THREE from 'three'
import { Bushes } from './Bushes'
import { OrbitViewScene } from './OrbitViewScene'
import type { OrbitView } from './OrbitViewScene'

const BUSH_WIDTH_METERS = 2
const BUSH_VIEW: OrbitView = {
  cameraStart: new THREE.Vector3(3.5, -4.5, 2.6),
  target: new THREE.Vector3(0, 0, 0.7),
  farMeters: 50,
  isDraggable: true,
}

/** The bush of the terrain alone on a clear background, turned in every direction by dragging. */
export class BushViewerScene extends OrbitViewScene {
  constructor(container: HTMLElement) {
    super(container, BUSH_VIEW)
    this.scene.add(new Bushes([{ x: 0, y: 0, widthMeters: BUSH_WIDTH_METERS, turnRadians: 0 }]).object)
  }

  protected advance(): void {
    // The bush does not move: only dragging turns it.
  }
}
