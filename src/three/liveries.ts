import * as THREE from 'three'
import { assetUrl } from '../assetUrl'

export type Livery = 'french' | 'vichy'

/** `full` for an aircraft that fills the view, `low` (a copy of 512 pixels, made by tools/make-low-textures.py) for one that is small or far. */
export type TextureDetail = 'full' | 'low'

const TEXTURE_URLS: Record<TextureDetail, Record<Livery, string>> = {
  full: {
    french: assetUrl('models/d520/texture-francais.png'),
    vichy: assetUrl('models/d520/texture-vichy.png'),
  },
  low: {
    french: assetUrl('models/d520/texture-francais-low.jpg'),
    vichy: assetUrl('models/d520/texture-vichy-low.jpg'),
  },
}
const ALL_LIVERIES = Object.keys(TEXTURE_URLS.full) as Livery[]

/** The textures of the liveries asked for, loaded together, reporting each one as it arrives. */
export class LiveryTextures {
  private readonly textures: Partial<Record<Livery, THREE.Texture>> = {}

  constructor(maxAnisotropy: number, onLoad: (livery: Livery, texture: THREE.Texture) => void, detail: TextureDetail = 'full', liveries: readonly Livery[] = ALL_LIVERIES) {
    const loader = new THREE.TextureLoader()
    for (const livery of liveries) {
      loader.load(TEXTURE_URLS[detail][livery], (texture) => {
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
