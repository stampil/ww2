import { DESTROYED_LEVEL } from './damageStages'
import { randomBetween } from './motion'
import type { Range } from './motion'

const REFERENCE_PIXELS = 1024
const BACKGROUND_SAMPLE = { x: 0.89, y: 0.37 }
const BACKGROUND_TOLERANCE = 18
const CHARRED_SHARE = 0.35
const JAGGED_CORNERS = 10
const MIN_JAGGED_SHARE = 0.55
const BULLET_RADIUS = { min: 5, max: 8 }
const SHRAPNEL_RADIUS = { min: 12, max: 26 }
const BURN_RADIUS = { min: 60, max: 110 }
const SOOT_SHARE = 2.5
const PLACEMENT_TRIES = 200
const HOLE_COLOR = '#14110d'
const HOLE_RIM_COLOR = 'rgba(190, 190, 180, 0.85)'
const SOOT_COLOR = 'rgba(20, 15, 10, 0.55)'
const SOOT_CLEAR_COLOR = 'rgba(20, 15, 10, 0)'
const BURN_CORE_COLOR = 'rgba(12, 9, 7, 0.85)'
const BURN_RIM_COLOR = 'rgba(210, 95, 25, 0.55)'

type Zone = { left: number; top: number; right: number; bottom: number }
type MarkKind = 'bullet' | 'shrapnel' | 'burn'
type Mark = { kind: MarkKind; x: number; y: number; radius: number; shape: number[] }
type LevelMarks = Record<MarkKind, number>

// The parts of the livery layout that show on the aircraft, as shares of the texture, without what sits beside them.
const DAMAGEABLE_ZONES: Zone[] = [
  { left: 0.03, top: 0, right: 0.99, bottom: 0.43 },
  { left: 0, top: 0.42, right: 0.72, bottom: 0.88 },
  { left: 0, top: 0.85, right: 0.6, bottom: 0.97 },
]
const EXCLUDED_ZONES: Zone[] = [
  { left: 0.34, top: 0, right: 0.85, bottom: 0.045 },
  { left: 0.84, top: 0.2, right: 0.99, bottom: 0.43 },
  { left: 0, top: 0.57, right: 0.14, bottom: 0.67 },
  { left: 0.59, top: 0.6, right: 0.74, bottom: 0.66 },
]
// What each level adds: many small bullet holes first, then torn shrapnel holes and burns.
const MARKS_BY_LEVEL: LevelMarks[] = [
  { bullet: 6, shrapnel: 0, burn: 0 },
  { bullet: 8, shrapnel: 0, burn: 0 },
  { bullet: 10, shrapnel: 1, burn: 0 },
  { bullet: 6, shrapnel: 4, burn: 0 },
  { bullet: 0, shrapnel: 5, burn: 1 },
  { bullet: 8, shrapnel: 6, burn: 2 },
  { bullet: 0, shrapnel: 8, burn: 3 },
  { bullet: 0, shrapnel: 0, burn: 0 },
]

function isInside(zone: Zone, x: number, y: number): boolean {
  return x >= zone.left && x < zone.right && y >= zone.top && y < zone.bottom
}

/**
 * The livery of the aircraft with its damage painted on a copy: holes, soot, burns, then charring when destroyed.
 * The marks stay where they were put: when the livery changes, the same damage is painted on the new one.
 */
export class DamagePainter {
  readonly canvas = document.createElement('canvas')
  private readonly context = this.canvas.getContext('2d', { willReadFrequently: true })!
  private image: HTMLImageElement
  private damageable = new Uint8Array(0)
  private readonly marks: Mark[] = []
  private level = 0

  constructor(image: HTMLImageElement) {
    this.image = image
    this.useImage(image)
  }

  /** Paints the same damage on another livery. */
  useImage(image: HTMLImageElement): void {
    this.image = image
    this.canvas.width = image.width
    this.canvas.height = image.height
    this.context.drawImage(image, 0, 0)
    this.damageable = this.findDamageablePixels()
    this.paint()
  }

  /** Adds the marks of every level up to this one, and paints everything again. */
  setLevel(level: number): void {
    while (this.level < level) {
      this.level += 1
      this.addMarks(MARKS_BY_LEVEL[this.level - 1])
    }
    this.paint()
  }

  private findDamageablePixels(): Uint8Array {
    const { width, height } = this.canvas
    const pixels = this.context.getImageData(0, 0, width, height).data
    const sample = (Math.floor(BACKGROUND_SAMPLE.y * height) * width + Math.floor(BACKGROUND_SAMPLE.x * width)) * 4
    const background = [pixels[sample], pixels[sample + 1], pixels[sample + 2]]
    const damageable = new Uint8Array(width * height)
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = (y * width + x) * 4
        const distance = Math.max(
          Math.abs(pixels[index] - background[0]),
          Math.abs(pixels[index + 1] - background[1]),
          Math.abs(pixels[index + 2] - background[2]),
        )
        const shareX = x / width
        const shareY = y / height
        const isOnAircraft = DAMAGEABLE_ZONES.some((zone) => isInside(zone, shareX, shareY))
        const isBeside = EXCLUDED_ZONES.some((zone) => isInside(zone, shareX, shareY))
        damageable[y * width + x] = distance > BACKGROUND_TOLERANCE && isOnAircraft && !isBeside ? 1 : 0
      }
    }
    return damageable
  }

  private addMarks(levelMarks: LevelMarks): void {
    this.addMarksOfKind('bullet', levelMarks.bullet, BULLET_RADIUS)
    this.addMarksOfKind('shrapnel', levelMarks.shrapnel, SHRAPNEL_RADIUS)
    this.addMarksOfKind('burn', levelMarks.burn, BURN_RADIUS)
  }

  private addMarksOfKind(kind: MarkKind, count: number, radius: Range): void {
    const { width, height } = this.canvas
    for (let added = 0; added < count; added += 1) {
      for (let attempt = 0; attempt < PLACEMENT_TRIES; attempt += 1) {
        const x = Math.random()
        const y = Math.random()
        if (this.damageable[Math.floor(y * height) * width + Math.floor(x * width)] === 1) {
          const shape = Array.from({ length: JAGGED_CORNERS }, () => MIN_JAGGED_SHARE + Math.random() * (1 - MIN_JAGGED_SHARE))
          this.marks.push({ kind, x, y, radius: randomBetween(radius), shape })
          break
        }
      }
    }
  }

  private paint(): void {
    const { width, height } = this.canvas
    this.context.drawImage(this.image, 0, 0)
    if (this.level >= DESTROYED_LEVEL) {
      this.char()
    }
    const scale = width / REFERENCE_PIXELS
    for (const mark of this.marks) {
      const x = mark.x * width
      const y = mark.y * height
      const radius = mark.radius * scale
      if (mark.kind === 'burn') {
        this.paintBurn(x, y, radius)
      } else {
        this.paintSoot(x, y, radius * SOOT_SHARE)
        this.paintHole(x, y, radius, mark.kind === 'shrapnel' ? mark.shape : [])
      }
    }
  }

  private char(): void {
    const { width, height } = this.canvas
    const image = this.context.getImageData(0, 0, width, height)
    for (let pixel = 0; pixel < this.damageable.length; pixel += 1) {
      if (this.damageable[pixel] === 1) {
        image.data[pixel * 4] *= CHARRED_SHARE
        image.data[pixel * 4 + 1] *= CHARRED_SHARE
        image.data[pixel * 4 + 2] *= CHARRED_SHARE
      }
    }
    this.context.putImageData(image, 0, 0)
  }

  private paintSoot(x: number, y: number, radius: number): void {
    const gradient = this.context.createRadialGradient(x, y, 0, x, y, radius)
    gradient.addColorStop(0, SOOT_COLOR)
    gradient.addColorStop(1, SOOT_CLEAR_COLOR)
    this.context.fillStyle = gradient
    this.context.beginPath()
    this.context.arc(x, y, radius, 0, 2 * Math.PI)
    this.context.fill()
  }

  /** A round hole, or a jagged one when the shape gives the reach of each corner. */
  private paintHole(x: number, y: number, radius: number, shape: number[]): void {
    this.context.beginPath()
    if (shape.length === 0) {
      this.context.arc(x, y, radius, 0, 2 * Math.PI)
    } else {
      shape.forEach((reach, corner) => {
        const angle = (2 * Math.PI * corner) / shape.length
        const pointX = x + Math.cos(angle) * radius * reach
        const pointY = y + Math.sin(angle) * radius * reach
        if (corner === 0) {
          this.context.moveTo(pointX, pointY)
        } else {
          this.context.lineTo(pointX, pointY)
        }
      })
      this.context.closePath()
    }
    this.context.fillStyle = HOLE_COLOR
    this.context.fill()
    this.context.strokeStyle = HOLE_RIM_COLOR
    this.context.lineWidth = Math.max(1, radius * 0.15)
    this.context.stroke()
  }

  private paintBurn(x: number, y: number, radius: number): void {
    const gradient = this.context.createRadialGradient(x, y, radius * 0.3, x, y, radius)
    gradient.addColorStop(0, BURN_CORE_COLOR)
    gradient.addColorStop(0.75, BURN_RIM_COLOR)
    gradient.addColorStop(1, SOOT_CLEAR_COLOR)
    this.context.fillStyle = gradient
    this.context.beginPath()
    this.context.arc(x, y, radius, 0, 2 * Math.PI)
    this.context.fill()
  }
}
