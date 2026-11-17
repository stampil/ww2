import {
  drawRoadGeometry,
  drawSurfaceDetails,
  EDGE_LINE_RATIO,
  LINE_COLOR,
  QUARTER_TURN_RADIANS,
  SHOULDER_COLOR,
  SHOULDER_RATIO,
} from './tiles'
import type { Tile } from './tiles'

export const TILE_IMAGE_PIXELS = 384
const MASK_COLOR = '#ffffff'

export type TerrainTextures = { grass: HTMLImageElement; concrete: HTMLImageElement }
type Layer = { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D }

function createLayer(): Layer {
  const canvas = document.createElement('canvas')
  canvas.width = TILE_IMAGE_PIXELS
  canvas.height = TILE_IMAGE_PIXELS
  return { canvas, context: canvas.getContext('2d', { willReadFrequently: true })! }
}

function paintPattern(context: CanvasRenderingContext2D, image: HTMLImageElement): void {
  context.fillStyle = context.createPattern(image, 'repeat')!
  context.fillRect(0, 0, TILE_IMAGE_PIXELS, TILE_IMAGE_PIXELS)
}

/** Runs a drawing turned by the tile's quarter turns about its center. The textures are never turned. */
function drawTurned(context: CanvasRenderingContext2D, tile: Tile, draw: () => void): void {
  context.save()
  context.translate(TILE_IMAGE_PIXELS / 2, TILE_IMAGE_PIXELS / 2)
  context.rotate(tile.quarterTurns * QUARTER_TURN_RADIANS)
  context.translate(-TILE_IMAGE_PIXELS / 2, -TILE_IMAGE_PIXELS / 2)
  draw()
  context.restore()
}

function roadMask(tile: Tile, inset: number): Layer {
  const layer = createLayer()
  layer.context.fillStyle = MASK_COLOR
  layer.context.strokeStyle = MASK_COLOR
  drawTurned(layer.context, tile, () => drawRoadGeometry(layer.context, tile.kind, TILE_IMAGE_PIXELS, inset))
  return layer
}

const [LINE_RED, LINE_GREEN, LINE_BLUE] = [1, 3, 5].map((offset) => parseInt(LINE_COLOR.slice(offset, offset + 2), 16))

function readPixels(layer: Layer): Uint8ClampedArray {
  return layer.context.getImageData(0, 0, TILE_IMAGE_PIXELS, TILE_IMAGE_PIXELS).data
}

/**
 * Paints one tile. The grass and the concrete are two textures whose repeat divides the tile, aligned on the tile corner
 * and never turned, so the ground continues across any two tiles, wherever they are put and however they are turned.
 */
export function renderTileImage(tile: Tile, textures: TerrainTextures): HTMLCanvasElement {
  const { canvas, context } = createLayer()
  paintPattern(context, textures.grass)

  context.fillStyle = SHOULDER_COLOR
  context.strokeStyle = SHOULDER_COLOR
  drawTurned(context, tile, () => drawRoadGeometry(context, tile.kind, TILE_IMAGE_PIXELS, -SHOULDER_RATIO * TILE_IMAGE_PIXELS))

  const concrete = createLayer()
  paintPattern(concrete.context, textures.concrete)
  const concretePixels = readPixels(concrete)
  const outerPixels = readPixels(roadMask(tile, 0))
  const innerPixels = readPixels(roadMask(tile, EDGE_LINE_RATIO * TILE_IMAGE_PIXELS))
  const ground = context.getImageData(0, 0, TILE_IMAGE_PIXELS, TILE_IMAGE_PIXELS)
  const lineColor = [LINE_RED, LINE_GREEN, LINE_BLUE]
  for (let index = 0; index < ground.data.length; index += 4) {
    const roadShare = outerPixels[index + 3] / 255
    const lineShare = Math.max(0, outerPixels[index + 3] - innerPixels[index + 3]) / 255
    for (let channel = 0; channel < 3; channel += 1) {
      const road = concretePixels[index + channel] * roadShare + ground.data[index + channel] * (1 - roadShare)
      ground.data[index + channel] = lineColor[channel] * lineShare + road * (1 - lineShare)
    }
  }
  context.putImageData(ground, 0, 0)

  drawTurned(context, tile, () => drawSurfaceDetails(context, tile.kind, TILE_IMAGE_PIXELS))
  return canvas
}
