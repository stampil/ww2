import * as THREE from 'three'
import { assetUrl } from '../assetUrl'
import { buildGeometry, buildMaterials, loadModelData } from './ac3d'
import type { TextureDetail } from './liveries'

const MODELS_URL = assetUrl('models/')

/** The small copy of a texture file, as tools/make-low-textures.py writes it beside the full-size one. */
function lowCopyOf(textureName: string): string {
  return textureName.replace(/\.png$/, '-low.jpg')
}

/** One aircraft of the game, as tools/convert-ac3d.py wrote it into public/models/<id>/, with its textures (full-size, or the small copies for an aircraft drawn small), as one group of parts that do not move. */
export async function loadStaticAircraft(aircraftId: string, detail: TextureDetail = 'full'): Promise<THREE.Group> {
  const { manifest, buffer } = await loadModelData(aircraftId, aircraftId)
  const loader = new THREE.TextureLoader()
  const textures = new Map<string, THREE.Texture>()
  for (const entry of manifest.materials) {
    if (entry.texture !== null && !textures.has(entry.texture)) {
      const texture = await loader.loadAsync(`${MODELS_URL}${aircraftId}/${detail === 'low' ? lowCopyOf(entry.texture) : entry.texture}`)
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
