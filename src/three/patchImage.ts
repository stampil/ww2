import { renderTileImage, TILE_IMAGE_PIXELS } from './tileImages'
import type { TerrainTextures } from './tileImages'
import type { Tile } from './tiles'

/**
 * Paints the tiles end to end on a canvas, each in a square of tilePixels, as they sit in the grid.
 * A tile is painted once per kind and turn.
 */
export function paintTiles(
  canvas: HTMLCanvasElement,
  tiles: Tile[][],
  textures: TerrainTextures,
  tilePixels = TILE_IMAGE_PIXELS,
): void {
  canvas.width = tiles[0].length * tilePixels
  canvas.height = tiles.length * tilePixels
  const context = canvas.getContext('2d')!
  context.imageSmoothingQuality = 'high'
  const images = new Map<string, HTMLCanvasElement>()
  tiles.forEach((rowTiles, row) => {
    rowTiles.forEach((tile, column) => {
      const key = `${tile.kind}:${tile.quarterTurns}`
      let image = images.get(key)
      if (image === undefined) {
        image = renderTileImage(tile, textures)
        images.set(key, image)
      }
      context.drawImage(image, column * tilePixels, row * tilePixels, tilePixels, tilePixels)
    })
  })
}
