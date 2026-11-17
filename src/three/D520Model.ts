import * as THREE from 'three'
import { FUSELAGE_SECTIONS, LENGTH_METERS, WING_EDGES, WINGSPAN_METERS } from './d520Plan'
import type { FuselageSection, WingEdge } from './d520Plan'

const GRID_COLUMNS = 256
const GRID_ROWS = Math.round((GRID_COLUMNS * LENGTH_METERS) / WINGSPAN_METERS)
const SILHOUETTE_ALPHA = 0.5
const NORMAL_STEP_METERS = 0.02
const WING_ROOT_Z_METERS = -0.77
const WING_DIHEDRAL_RADIANS = (5 * Math.PI) / 180
const WING_ROOT_THICKNESS_METERS = 0.25
const WING_TIP_THICKNESS_METERS = 0.08
const FLAT_PART_THICKNESS_METERS = 0.04
const WING_BAND_MARGIN_METERS = 0.08
const UNDERSIDE_COLOR = 0x555555
const SURFACE_ROUGHNESS = 0.85
const TOP = 1
const BOTTOM = -1

type Side = typeof TOP | typeof BOTTOM
type Corner = { column: number; row: number; alpha: number }
type Point = { x: number; y: number; isCut: boolean }

const WING_ROOT_HALF_WIDTH_METERS = WING_EDGES[0].x
const WING_STEP_METERS = WING_EDGES[1].x - WING_EDGES[0].x
const WING_HALF_SPAN_METERS = WINGSPAN_METERS / 2

function wingEdgesAt(distance: number): WingEdge {
  const index = Math.round((distance - WING_ROOT_HALF_WIDTH_METERS) / WING_STEP_METERS)
  return WING_EDGES[Math.min(Math.max(index, 0), WING_EDGES.length - 1)]
}

function fuselageAt(y: number): FuselageSection | undefined {
  for (let index = 0; index < FUSELAGE_SECTIONS.length - 1; index += 1) {
    const tailSide = FUSELAGE_SECTIONS[index]
    const noseSide = FUSELAGE_SECTIONS[index + 1]
    if (y >= tailSide.y && y <= noseSide.y) {
      const share = (y - tailSide.y) / (noseSide.y - tailSide.y)
      return {
        y,
        halfWidth: tailSide.halfWidth + share * (noseSide.halfWidth - tailSide.halfWidth),
        top: tailSide.top + share * (noseSide.top - tailSide.top),
        bottom: tailSide.bottom + share * (noseSide.bottom - tailSide.bottom),
      }
    }
  }
  return undefined
}

/** Height of the top or the bottom surface at a point: a thin wing with dihedral, joined to the lofted fuselage. */
function surfaceHeight(x: number, y: number, side: Side): number {
  const distance = Math.abs(x)
  const wing = wingEdgesAt(distance)
  let middle = 0
  let thickness = FLAT_PART_THICKNESS_METERS
  if (y >= wing.trailing - WING_BAND_MARGIN_METERS && y <= wing.leading + WING_BAND_MARGIN_METERS) {
    const outward = Math.max(0, distance - WING_ROOT_HALF_WIDTH_METERS)
    const span = outward / (WING_HALF_SPAN_METERS - WING_ROOT_HALF_WIDTH_METERS)
    middle = WING_ROOT_Z_METERS + Math.tan(WING_DIHEDRAL_RADIANS) * outward
    thickness = WING_ROOT_THICKNESS_METERS + span * (WING_TIP_THICKNESS_METERS - WING_ROOT_THICKNESS_METERS)
  }
  const height = middle + (side * thickness) / 2

  const fuselage = fuselageAt(y)
  if (fuselage === undefined || distance >= fuselage.halfWidth) {
    return height
  }
  const roundness = Math.sqrt(1 - (distance / fuselage.halfWidth) ** 2)
  const center = (fuselage.top + fuselage.bottom) / 2
  const radius = (fuselage.top - fuselage.bottom) / 2
  const fuselageHeight = center + side * radius * roundness
  return side === TOP ? Math.max(height, fuselageHeight) : Math.min(height, fuselageHeight)
}

function surfaceNormal(x: number, y: number, side: Side): THREE.Vector3 {
  const slopeX = (surfaceHeight(x + NORMAL_STEP_METERS, y, side) - surfaceHeight(x - NORMAL_STEP_METERS, y, side)) / (2 * NORMAL_STEP_METERS)
  const slopeY = (surfaceHeight(x, y + NORMAL_STEP_METERS, side) - surfaceHeight(x, y - NORMAL_STEP_METERS, side)) / (2 * NORMAL_STEP_METERS)
  return new THREE.Vector3(-slopeX, -slopeY, 1).normalize().multiplyScalar(side)
}

/** The alpha of the livery at every vertex of the grid, with a bilinear read so the outline stays smooth. */
function readAlphaGrid(texture: THREE.Texture): Float32Array {
  const image = texture.image as HTMLImageElement
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const context = canvas.getContext('2d', { willReadFrequently: true })!
  context.drawImage(image, 0, 0)
  const pixels = context.getImageData(0, 0, image.width, image.height).data
  const alphaAt = (pixelColumn: number, pixelRow: number): number => pixels[(pixelRow * image.width + pixelColumn) * 4 + 3] / 255

  const alphas = new Float32Array((GRID_ROWS + 1) * (GRID_COLUMNS + 1))
  for (let row = 0; row <= GRID_ROWS; row += 1) {
    for (let column = 0; column <= GRID_COLUMNS; column += 1) {
      const u = (column / GRID_COLUMNS) * (image.width - 1)
      const v = (row / GRID_ROWS) * (image.height - 1)
      const left = Math.floor(u)
      const top = Math.floor(v)
      const right = Math.min(left + 1, image.width - 1)
      const bottom = Math.min(top + 1, image.height - 1)
      const shareX = u - left
      const shareY = v - top
      const upper = alphaAt(left, top) * (1 - shareX) + alphaAt(right, top) * shareX
      const lower = alphaAt(left, bottom) * (1 - shareX) + alphaAt(right, bottom) * shareX
      alphas[row * (GRID_COLUMNS + 1) + column] = upper * (1 - shareY) + lower * shareY
    }
  }
  return alphas
}

function gridPoint(column: number, row: number, isCut: boolean): Point {
  return { x: (column / GRID_COLUMNS - 0.5) * WINGSPAN_METERS, y: (0.5 - row / GRID_ROWS) * LENGTH_METERS, isCut }
}

/** The part of one grid cell that lies inside the silhouette, with the outline cut where the alpha crosses the threshold. */
function silhouettePolygon(corners: Corner[]): Point[] {
  const polygon: Point[] = []
  corners.forEach((corner, index) => {
    const next = corners[(index + 1) % corners.length]
    const cornerInside = corner.alpha >= SILHOUETTE_ALPHA
    const nextInside = next.alpha >= SILHOUETTE_ALPHA
    if (cornerInside) {
      polygon.push(gridPoint(corner.column, corner.row, false))
    }
    if (cornerInside !== nextInside) {
      const share = (SILHOUETTE_ALPHA - corner.alpha) / (next.alpha - corner.alpha)
      polygon.push(gridPoint(corner.column + share * (next.column - corner.column), corner.row + share * (next.row - corner.row), true))
    }
  })
  return polygon
}

/**
 * One surface, only where the livery is opaque: its edge is the geometry itself, so it is smoothed by the multisampling.
 * The top surface also carries the thin wall that closes the outline down to the bottom surface.
 */
function buildSurface(side: Side, alphas: Float32Array): THREE.BufferGeometry {
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const rowSize = GRID_COLUMNS + 1
  const addVertex = (point: Point, surfaceSide: Side, normal: THREE.Vector3 = surfaceNormal(point.x, point.y, surfaceSide)): void => {
    positions.push(point.x, point.y, surfaceHeight(point.x, point.y, surfaceSide))
    normals.push(normal.x, normal.y, normal.z)
    uvs.push(point.x / WINGSPAN_METERS + 0.5, point.y / LENGTH_METERS + 0.5)
  }
  const addWall = (from: Point, to: Point): void => {
    const outward = new THREE.Vector3(from.y - to.y, to.x - from.x, 0).normalize()
    addVertex(from, TOP, outward)
    addVertex(to, BOTTOM, outward)
    addVertex(from, BOTTOM, outward)
    addVertex(from, TOP, outward)
    addVertex(to, TOP, outward)
    addVertex(to, BOTTOM, outward)
  }
  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let column = 0; column < GRID_COLUMNS; column += 1) {
      const polygon = silhouettePolygon([
        { column, row, alpha: alphas[row * rowSize + column] },
        { column: column + 1, row, alpha: alphas[row * rowSize + column + 1] },
        { column: column + 1, row: row + 1, alpha: alphas[(row + 1) * rowSize + column + 1] },
        { column, row: row + 1, alpha: alphas[(row + 1) * rowSize + column] },
      ])
      for (let index = 1; index < polygon.length - 1; index += 1) {
        const triangle = side === TOP ? [polygon[0], polygon[index + 1], polygon[index]] : [polygon[0], polygon[index], polygon[index + 1]]
        triangle.forEach((point) => addVertex(point, side))
      }
      if (side === TOP) {
        polygon.forEach((point, index) => {
          const next = polygon[(index + 1) % polygon.length]
          if (point.isCut && next.isCut) {
            addWall(point, next)
          }
        })
      }
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  return geometry
}

/**
 * The D.520 as two surfaces cut to the silhouette of its livery, built from the plan: wing, dihedral, fuselage sections.
 * Nose along +y, right wing along +x, up along +z, built and shown when the first livery arrives.
 */
export class D520Model {
  readonly object = new THREE.Group()
  private readonly topMaterial = new THREE.MeshStandardMaterial({ roughness: SURFACE_ROUGHNESS })
  private readonly bottomMaterial = new THREE.MeshStandardMaterial({ roughness: SURFACE_ROUGHNESS, color: UNDERSIDE_COLOR })

  setLivery(texture: THREE.Texture): void {
    if (this.object.children.length === 0) {
      const alphas = readAlphaGrid(texture)
      this.object.add(new THREE.Mesh(buildSurface(TOP, alphas), this.topMaterial))
      this.object.add(new THREE.Mesh(buildSurface(BOTTOM, alphas), this.bottomMaterial))
    }
    this.topMaterial.map = texture
    this.bottomMaterial.map = texture
    this.topMaterial.needsUpdate = true
    this.bottomMaterial.needsUpdate = true
  }
}
