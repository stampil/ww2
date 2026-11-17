import type { TerrainTextures } from './tileImages'

const GRASS_URL = '/textures/herbe.png'
const CONCRETE_URL = '/textures/beton.png'

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Cannot load ${url}`))
    image.src = url
  })
}

/** The grass and the concrete that every tile of the terrain is painted with. */
export async function loadTerrainTextures(): Promise<TerrainTextures> {
  const [grass, concrete] = await Promise.all([loadImage(GRASS_URL), loadImage(CONCRETE_URL)])
  return { grass, concrete }
}
