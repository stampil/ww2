import * as THREE from 'three'
import { assetUrl } from '../assetUrl'

export type Livery = 'french' | 'german' | 'vichy'

/** `full` for an aircraft that fills the view, `low` (a copy of 512 pixels, made by tools/make-low-textures.py) for one that is small or far. */
export type TextureDetail = 'full' | 'low'

const TEXTURE_URLS: Record<TextureDetail, Record<Livery, string>> = {
  full: {
    french: assetUrl('models/d520/texture-francais.png'),
    german: assetUrl('models/d520/texture-allemand.png'),
    vichy: assetUrl('models/d520/texture-vichy.png'),
  },
  low: {
    french: assetUrl('models/d520/texture-francais-low.jpg'),
    german: assetUrl('models/d520/texture-allemand-low.jpg'),
    vichy: assetUrl('models/d520/texture-vichy-low.jpg'),
  },
}
// The liveries of the home page, which has no others.
const HOME_LIVERIES: readonly Livery[] = ['french', 'vichy']

/** The textures of the liveries asked for, loaded together, reporting each one as it arrives; more can be asked for later. */
export class LiveryTextures {
  private readonly textures: Partial<Record<Livery, THREE.Texture>> = {}
  private readonly requested = new Set<Livery>()
  private readonly loader = new THREE.TextureLoader()

  constructor(
    private readonly maxAnisotropy: number,
    private readonly onLoad: (livery: Livery, texture: THREE.Texture) => void,
    private readonly detail: TextureDetail = 'full',
    liveries: readonly Livery[] = HOME_LIVERIES,
  ) {
    liveries.forEach((livery) => this.request(livery))
  }

  /** Starts loading a livery, unless it is already loading or loaded. */
  request(livery: Livery): void {
    if (this.requested.has(livery)) {
      return
    }
    this.requested.add(livery)
    this.loader.load(TEXTURE_URLS[this.detail][livery], (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = this.maxAnisotropy
      this.textures[livery] = texture
      this.onLoad(livery, texture)
    })
  }

  get(livery: Livery): THREE.Texture | undefined {
    return this.textures[livery]
  }

  dispose(): void {
    Object.values(this.textures).forEach((texture) => texture.dispose())
  }
}
