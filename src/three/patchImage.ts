import { renderTileImage, TILE_IMAGE_PIXELS } from './tileImages'
import type { TerrainTextures } from './tileImages'
import type { Tile } from './tiles'

/** Paints the tiles end to end on a canvas, one tile image after the other, as they sit in the grid. */
export function paintTiles(canvas: HTMLCanvasElement, tiles: Tile[][], textures: TerrainTextures): void {
  canvas.width = tiles[0].length * TILE_IMAGE_PIXELS
  canvas.height = tiles.length * TILE_IMAGE_PIXELS
  const context = canvas.getContext('2d')!
  tiles.forEach((rowTiles, row) => {
    rowTiles.forEach((tile, column) => {
      context.drawImage(renderTileImage(tile, textures), column * TILE_IMAGE_PIXELS, row * TILE_IMAGE_PIXELS)
    })
  })
}
