import * as THREE from 'three'
import { FUSELAGE_SECTIONS, LENGTH_METERS, WING_EDGES, WINGSPAN_METERS } from './d520Plan'
import type { FuselageSection, WingEdge } from './d520Plan'

const GRID_COLUMNS = 192
const GRID_ROWS = Math.round((GRID_COLUMNS * LENGTH_METERS) / WINGSPAN_METERS)
const WING_ROOT_Z_METERS = -0.77
const WING_DIHEDRAL_RADIANS = (5 * Math.PI) / 180
const WING_ROOT_THICKNESS_METERS = 0.25
const WING_TIP_THICKNESS_METERS = 0.08
const FLAT_PART_THICKNESS_METERS = 0.04
const UNDERSIDE_COLOR = 0x555555
const ALPHA_CUTOFF = 0.5
const SURFACE_ROUGHNESS = 0.85
const TOP = 1
const BOTTOM = -1

type Side = typeof TOP | typeof BOTTOM

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
  if (y >= wing.trailing && y <= wing.leading) {
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

function buildSurface(side: Side): THREE.BufferGeometry {
  const positions: number[] = []
  const uvs: number[] = []
  for (let row = 0; row <= GRID_ROWS; row += 1) {
    for (let column = 0; column <= GRID_COLUMNS; column += 1) {
      const x = (column / GRID_COLUMNS - 0.5) * WINGSPAN_METERS
      const y = (0.5 - row / GRID_ROWS) * LENGTH_METERS
      positions.push(x, y, surfaceHeight(x, y, side))
      uvs.push(column / GRID_COLUMNS, 1 - row / GRID_ROWS)
    }
  }
  const indices: number[] = []
  const rowSize = GRID_COLUMNS + 1
  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let column = 0; column < GRID_COLUMNS; column += 1) {
      const northWest = row * rowSize + column
      const northEast = northWest + 1
      const southWest = northWest + rowSize
      const southEast = southWest + 1
      if (side === TOP) {
        indices.push(northWest, southWest, northEast, northEast, southWest, southEast)
      } else {
        indices.push(northWest, northEast, southWest, northEast, southEast, southWest)
      }
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

/**
 * The D.520 as two surfaces cut out by the alpha of the livery, built from the plan: wing, dihedral, fuselage sections.
 * Nose along +y, right wing along +x, up along +z, hidden until a livery is set.
 */
export class D520Model {
  readonly object = new THREE.Group()
  private readonly topMaterial = new THREE.MeshStandardMaterial({ alphaTest: ALPHA_CUTOFF, roughness: SURFACE_ROUGHNESS })
  private readonly bottomMaterial = new THREE.MeshStandardMaterial({
    alphaTest: ALPHA_CUTOFF,
    roughness: SURFACE_ROUGHNESS,
    color: UNDERSIDE_COLOR,
  })

  constructor() {
    this.object.add(new THREE.Mesh(buildSurface(TOP), this.topMaterial))
    this.object.add(new THREE.Mesh(buildSurface(BOTTOM), this.bottomMaterial))
    this.object.visible = false
  }

  setLivery(texture: THREE.Texture): void {
    this.topMaterial.map = texture
    this.bottomMaterial.map = texture
    this.topMaterial.needsUpdate = true
    this.bottomMaterial.needsUpdate = true
    this.object.visible = true
  }
}
