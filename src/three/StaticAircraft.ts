import * as THREE from 'three'
import { assetUrl } from '../assetUrl'
import { buildGeometry, buildMaterials, loadModelData } from './ac3d'

const MODELS_URL = assetUrl('models/')

/** One aircraft of the game, as tools/convert-ac3d.py wrote it into public/models/<id>/, with its textures, as one group of parts that do not move. */
export async function loadStaticAircraft(aircraftId: string): Promise<THREE.Group> {
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
  return aircraft
}
