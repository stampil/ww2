import * as THREE from 'three'
import { CockpitModel } from './CockpitModel'
import type { CockpitControl } from './CockpitModel'
import { OrbitViewScene } from './OrbitViewScene'
import type { OrbitView } from './OrbitViewScene'

const COCKPIT_VIEW: OrbitView = {
  cameraStart: new THREE.Vector3(0.6, -1, 0.8),
  target: new THREE.Vector3(0, 0.35, 0.15),
  farMeters: 20,
}

/** The D.520 cockpit alone on a clear background, turned in every direction by dragging, with its animations. */
export class CockpitViewerScene extends OrbitViewScene {
  private readonly cockpit = new CockpitModel()

  constructor(container: HTMLElement) {
    super(container, COCKPIT_VIEW)
    this.scene.add(this.cockpit.object)
  }

  setControl(control: CockpitControl, isActive: boolean): void {
    this.cockpit.setControl(control, isActive)
  }

  protected advance(deltaSeconds: number): void {
    this.cockpit.update(deltaSeconds)
  }
}
