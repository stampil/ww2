import * as THREE from 'three'

export type Livery = 'french' | 'german'

const TEXTURE_URLS: Record<Livery, string> = {
  french: '/textures/d520-francais.png',
  german: '/textures/d520-allemand.png',
}

/** The textures of both liveries, loaded together, reporting each one as it arrives. */
export class LiveryTextures {
  private readonly textures: Partial<Record<Livery, THREE.Texture>> = {}

  constructor(maxAnisotropy: number, onLoad: (livery: Livery, texture: THREE.Texture) => void) {
    const loader = new THREE.TextureLoader()
    const liveries = Object.keys(TEXTURE_URLS) as Livery[]
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
