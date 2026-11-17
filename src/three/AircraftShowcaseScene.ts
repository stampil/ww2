import * as THREE from 'three'
import { assetUrl } from '../assetUrl'
import { buildGeometry, buildMaterials, loadModelData } from './ac3d'
import { OrbitViewScene } from './OrbitViewScene'
import type { OrbitView } from './OrbitViewScene'

const MODELS_URL = assetUrl('models/')
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
    const { manifest, buffer } = await loadModelData(aircraftId, aircraftId)
    const loader = new THREE.TextureLoader()
    const textures = new Map<string, THREE.Texture>()
    for (const entry of manifest.materials) {
      if (entry.texture !== null && !textures.has(entry.texture)) {
        const texture = await loader.loadAsync(`${MODELS_URL}${aircraftId}/${entry.texture}`)
        texture.colorSpace = THREE.SRGBColorSpace
        textures.set(entry.texture, texture)
      }
    }
    if (this.isDisposed) {
      return
    }

    const materials = buildMaterials(manifest)
    for (let index = 0; index < manifest.materials.length; index += 1) {
      const textureName = manifest.materials[index].texture
      if (textureName !== null) {
        materials[index].map = textures.get(textureName)!
      }
    }
    const aircraft = new THREE.Group()
    for (const part of manifest.parts) {
      aircraft.add(new THREE.Mesh(buildGeometry(part, buffer, true), materials))
    }
    this.scene.add(aircraft)

    const bounds = new THREE.Box3().setFromObject(aircraft)
    const sphere = bounds.getBoundingSphere(new THREE.Sphere())
    this.frame(sphere.center, sphere.radius)
  }
}
