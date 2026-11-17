import * as THREE from 'three'
import { assetUrl } from '../assetUrl'

export type Livery = 'french' | 'vichy'

const TEXTURE_URLS: Record<Livery, string> = {
  french: assetUrl('models/d520/texture-francais.png'),
  vichy: assetUrl('models/d520/texture-vichy.png'),
}
const ALL_LIVERIES = Object.keys(TEXTURE_URLS) as Livery[]

/** The textures of the liveries asked for, loaded together, reporting each one as it arrives. */
export class LiveryTextures {
  private readonly textures: Partial<Record<Livery, THREE.Texture>> = {}

  constructor(maxAnisotropy: number, onLoad: (livery: Livery, texture: THREE.Texture) => void, liveries: readonly Livery[] = ALL_LIVERIES) {
    const loader = new THREE.TextureLoader()
    for (const livery of liveries) {
      loader.load(TEXTURE_URLS[livery], (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace
        texture.anisotropy = maxAnisotropy
        this.textures[livery] = texture
        onLoad(livery, texture)
      })
    }
  }

  get(livery: Livery): THREE.Texture | undefined {
    return this.textures[livery]
  }

  dispose(): void {
    Object.values(this.textures).forEach((texture) => texture.dispose())
  }
}
