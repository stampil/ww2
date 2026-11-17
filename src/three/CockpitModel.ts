import * as THREE from 'three'
import { buildGeometry, buildMaterials, loadModelData } from './ac3d'
import { EasedValue } from './motion'

const MODEL_NAME = 'cockpit'
const TEXTURES_URL = '/models/d520/cockpit/'
const CANOPY_PARTS = ['intcanopy', 'inttourcanopy']
const CANOPY_TRAVEL_METERS = 0.6
const CANOPY_TRAVEL_SECONDS = 2

export type CockpitControl = 'openCanopy'
export const COCKPIT_CONTROLS: CockpitControl[] = ['openCanopy']

/**
 * The cockpit of the FlightGear D.520 by Emmanuel Baranger (GPL v2): frame, panel and seat, in the frame of the exterior.
 * Its canopy slides aft, as in Models/Interior/interior.xml. Shown once loaded.
 */
export class CockpitModel {
  readonly object = new THREE.Group()
  /** Where the sliding canopy is, for the exterior canopy to follow. */
  readonly canopyTranslation = new THREE.Vector3()
  private readonly parts = new Map<string, THREE.Mesh>()
  private readonly canopy = new EasedValue(CANOPY_TRAVEL_SECONDS)

  constructor() {
    void this.load()
  }

  setControl(control: CockpitControl, isActive: boolean): void {
    switch (control) {
      case 'openCanopy':
        this.canopy.setTarget(isActive ? 1 : 0)
        break
    }
  }

  update(deltaSeconds: number): void {
    this.canopy.update(deltaSeconds)
    this.canopyTranslation.set(0, -CANOPY_TRAVEL_METERS * this.canopy.position, 0)
    CANOPY_PARTS.forEach((name) => this.parts.get(name)?.position.copy(this.canopyTranslation))
  }

  private async load(): Promise<void> {
    const { manifest, buffer } = await loadModelData(MODEL_NAME)
    const materials = buildMaterials(manifest)
    const loader = new THREE.TextureLoader()
    const textures = new Map<string, THREE.Texture>()
    manifest.materials.forEach((entry, index) => {
      if (!textures.has(entry.texture)) {
        const texture = loader.load(TEXTURES_URL + entry.texture)
        texture.colorSpace = THREE.SRGBColorSpace
        textures.set(entry.texture, texture)
      }
      materials[index].map = textures.get(entry.texture)!
    })
    for (const entry of manifest.parts) {
      const mesh = new THREE.Mesh(buildGeometry(entry, buffer, true), materials)
      this.parts.set(entry.name, mesh)
      this.object.add(mesh)
    }
  }
}
