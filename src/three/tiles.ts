export type EdgeKind = 'grass' | 'taxiway' | 'runway'
export type TileKind =
  | 'grass'
  | 'bushes'
  | 'apron'
  | 'taxiwayStraight'
  | 'taxiwayCurve'
  | 'taxiwayT'
  | 'taxiwayCross'
  | 'taxiwayEnd'
  | 'taxiwayEndApron'
  | 'runwayStraight'
  | 'runwayEnd'
  | 'runwayTaxiwayJunction'
  | 'runwayTaxiwayCrossing'
export type Tile = { kind: TileKind; quarterTurns: number }
/** Edge kinds in the order north, east, south, west, before any rotation. */
export type Edges = readonly [EdgeKind, EdgeKind, EdgeKind, EdgeKind]

/** Two tiles fit side by side, in any rotation, when the edges that touch have the same kind. */
export const TILE_EDGES: Record<TileKind, Edges> = {
  grass: ['grass', 'grass', 'grass', 'grass'],
  bushes: ['grass', 'grass', 'grass', 'grass'],
  apron: ['grass', 'grass', 'grass', 'grass'],
  taxiwayStraight: ['taxiway', 'grass', 'taxiway', 'grass'],
  taxiwayCurve: ['taxiway', 'taxiway', 'grass', 'grass'],
  taxiwayT: ['taxiway', 'taxiway', 'taxiway', 'grass'],
  taxiwayCross: ['taxiway', 'taxiway', 'taxiway', 'taxiway'],
  taxiwayEnd: ['taxiway', 'grass', 'grass', 'grass'],
  taxiwayEndApron: ['taxiway', 'grass', 'grass', 'grass'],
  runwayStraight: ['grass', 'runway', 'grass', 'runway'],
  runwayEnd: ['grass', 'grass', 'grass', 'runway'],
  runwayTaxiwayJunction: ['grass', 'runway', 'taxiway', 'runway'],
  runwayTaxiwayCrossing: ['taxiway', 'runway', 'taxiway', 'runway'],
}

type Context = CanvasRenderingContext2D
type Pad = { left: number; top: number; right: number; bottom: number }

export const QUARTER_TURN_RADIANS = Math.PI / 2
export const EDGE_LINE_RATIO = 1 / 64
export const SHOULDER_RATIO = 1 / 64
export const LINE_COLOR = '#eeebe4'
export const SHOULDER_COLOR = '#897c4f'

const EDGE_COUNT = 4
const TAXIWAY_WIDTH_RATIO = 0.25
const RUNWAY_WIDTH_RATIO = 0.5
const FILLET_RATIO = 0.125
const EDGE_GUARD_RATIO = 1 / 96
const TAXIWAY_END_REACH_RATIO = 0.6
const RUNWAY_END_REACH_RATIO = 0.8
const END_APRON_ARM_REACH_RATIO = 0.55
const APRON_PAD: Pad = { left: 0.2, top: 0.2, right: 0.8, bottom: 0.8 }
const END_APRON_PAD: Pad = { left: 0.22, top: 0.5, right: 0.78, bottom: 0.88 }
const PAD_CORNER_RATIO = 0.03
const SLAB_JOINT_COUNT = 2
const SLAB_JOINT_RATIO = 1 / 128
const SLAB_JOINT_COLOR = 'rgba(60, 54, 48, 0.4)'
const DASH_START_RATIO = 0.1
const DASH_END_RATIO = 0.35
const TAXIWAY_LINE_RATIO = 1 / 64
const RUNWAY_LINE_RATIO = 1 / 48
const TAXIWAY_LINE_COLOR = '#d6bd50'
const THRESHOLD_BAR_OFFSETS = [-0.19, -0.07, 0.07, 0.19]
const THRESHOLD_START_RATIO = 0.6
const THRESHOLD_END_RATIO = 0.72
const THRESHOLD_BAR_RATIO = 1 / 32
export const BUSHES = [
  { x: 0.38, y: 0.4, radius: 0.1 },
  { x: 0.5, y: 0.33, radius: 0.08 },
  { x: 0.58, y: 0.5, radius: 0.1 },
  { x: 0.42, y: 0.58, radius: 0.08 },
]
const BUSH_LIGHT_COLOR = '#7c8e50'
const BUSH_DARK_COLOR = '#273311'
const BUSH_SHADOW_COLOR = 'rgba(39, 51, 17, 0.35)'
const BUSH_SHADOW_OFFSET_RATIO = 0.02
const BUSH_HIGHLIGHT_SHIFT = 0.3

function roadEdgeIndexes(edges: Edges): number[] {
  const indexes: number[] = []
  edges.forEach((edge, index) => {
    if (edge !== 'grass') {
      indexes.push(index)
    }
  })
  return indexes
}

function halfWidthOf(edge: EdgeKind, size: number): number {
  return ((edge === 'runway' ? RUNWAY_WIDTH_RATIO : TAXIWAY_WIDTH_RATIO) * size) / 2
}

/** Draws in a frame centered on the tile whose north points to the given edge, so every arm is drawn the same way. */
function inEdgeFrame(context: Context, size: number, edgeIndex: number, draw: () => void): void {
  context.save()
  context.translate(size / 2, size / 2)
  context.rotate(edgeIndex * QUARTER_TURN_RADIANS)
  draw()
  context.restore()
}

function armShape(kind: TileKind, size: number): { reach: number; isEnd: boolean; hasRoundEnd: boolean } {
  switch (kind) {
    case 'taxiwayEnd':
      return { reach: size * TAXIWAY_END_REACH_RATIO, isEnd: true, hasRoundEnd: true }
    case 'taxiwayEndApron':
      return { reach: size * END_APRON_ARM_REACH_RATIO, isEnd: true, hasRoundEnd: false }
    case 'runwayEnd':
      return { reach: size * RUNWAY_END_REACH_RATIO, isEnd: true, hasRoundEnd: false }
    default:
      return { reach: size / 2, isEnd: false, hasRoundEnd: false }
  }
}

/** One band from the north edge towards the center, or to its end in the tile. An inset narrows the band. */
function drawArm(context: Context, size: number, halfWidth: number, kind: TileKind, inset: number): void {
  const { reach, isEnd, hasRoundEnd } = armShape(kind, size)
  const radius = halfWidth - inset
  const top = -size / 2
  if (hasRoundEnd) {
    const capCenter = top + reach - halfWidth
    context.fillRect(-radius, top, 2 * radius, capCenter - top)
    context.beginPath()
    context.arc(0, capCenter, radius, 0, 2 * Math.PI)
    context.fill()
    return
  }
  context.fillRect(-radius, top, 2 * radius, reach - (isEnd ? inset : 0))
}

/**
 * The quarter circle that joins the north and east edges. The arc is kept off the last pixels of each edge,
 * where plain rectangles take over, so the band meets the edge exactly as a straight arm does.
 */
function drawCurve(context: Context, size: number, inset: number): void {
  const guard = size * EDGE_GUARD_RATIO
  const radius = (TAXIWAY_WIDTH_RATIO * size) / 2 - inset
  context.save()
  context.beginPath()
  context.rect(-size / 2 + guard, -size / 2 + guard, size - 2 * guard, size - 2 * guard)
  context.clip()
  context.lineWidth = 2 * radius
  context.beginPath()
  context.arc(size / 2, -size / 2, size / 2, Math.PI, Math.PI / 2, true)
  context.stroke()
  context.restore()
  context.fillRect(-radius, -size / 2, 2 * radius, guard + 1)
  context.fillRect(size / 2 - guard - 1, -radius, guard + 1, 2 * radius)
}

/** Rounds the concave corner between the north arm and the east arm. */
function drawFillet(context: Context, size: number, northHalfWidth: number, eastHalfWidth: number): void {
  const radius = size * FILLET_RATIO
  const cornerX = northHalfWidth
  const cornerY = -eastHalfWidth
  context.beginPath()
  context.moveTo(cornerX, cornerY)
  context.lineTo(cornerX, cornerY - radius)
  context.arc(cornerX + radius, cornerY - radius, radius, Math.PI, Math.PI / 2, true)
  context.closePath()
  context.fill()
}

/** A concrete pad inside the tile. Pads take no edge line, so only a negative inset (the shoulder) changes them. */
function drawPad(context: Context, size: number, pad: Pad, inset: number): void {
  const grow = -Math.min(inset, 0)
  context.beginPath()
  context.roundRect(
    pad.left * size - grow,
    pad.top * size - grow,
    (pad.right - pad.left) * size + 2 * grow,
    (pad.bottom - pad.top) * size + 2 * grow,
    PAD_CORNER_RATIO * size,
  )
  context.fill()
}

/**
 * Fills the road of a tile, in tile coordinates and before any rotation, with the current fill and stroke styles.
 * An inset narrows the road, a negative one widens it. Arms always reach the middle of the edge, at the same width.
 */
export function drawRoadGeometry(context: Context, kind: TileKind, size: number, inset: number): void {
  if (kind === 'apron') {
    drawPad(context, size, APRON_PAD, inset)
    return
  }
  if (kind === 'taxiwayCurve') {
    inEdgeFrame(context, size, 0, () => drawCurve(context, size, inset))
    return
  }
  const edges = TILE_EDGES[kind]
  const roadEdges = roadEdgeIndexes(edges)
  for (const index of roadEdges) {
    const halfWidth = halfWidthOf(edges[index], size)
    inEdgeFrame(context, size, index, () => drawArm(context, size, halfWidth, kind, inset))
  }
  for (const index of roadEdges) {
    const nextIndex = (index + 1) % EDGE_COUNT
    if (edges[nextIndex] !== 'grass') {
      const northHalfWidth = halfWidthOf(edges[index], size) - inset
      const eastHalfWidth = halfWidthOf(edges[nextIndex], size) - inset
      inEdgeFrame(context, size, index, () => drawFillet(context, size, northHalfWidth, eastHalfWidth))
    }
  }
  if (kind === 'taxiwayEndApron') {
    drawPad(context, size, END_APRON_PAD, inset)
  }
}

function drawSlabJoints(context: Context, size: number, pad: Pad): void {
  context.strokeStyle = SLAB_JOINT_COLOR
  context.lineWidth = size * SLAB_JOINT_RATIO
  for (let joint = 1; joint <= SLAB_JOINT_COUNT; joint += 1) {
    const share = joint / (SLAB_JOINT_COUNT + 1)
    const x = (pad.left + share * (pad.right - pad.left)) * size
    const y = (pad.top + share * (pad.bottom - pad.top)) * size
    context.beginPath()
    context.moveTo(x, pad.top * size)
    context.lineTo(x, pad.bottom * size)
    context.moveTo(pad.left * size, y)
    context.lineTo(pad.right * size, y)
    context.stroke()
  }
}

function drawBushes(context: Context, size: number): void {
  for (const bush of BUSHES) {
    const x = bush.x * size
    const y = bush.y * size
    const radius = bush.radius * size
    context.fillStyle = BUSH_SHADOW_COLOR
    context.beginPath()
    context.arc(x + BUSH_SHADOW_OFFSET_RATIO * size, y + BUSH_SHADOW_OFFSET_RATIO * size, radius, 0, 2 * Math.PI)
    context.fill()
    const shift = BUSH_HIGHLIGHT_SHIFT * radius
    const gradient = context.createRadialGradient(x - shift, y - shift, radius * 0.1, x, y, radius)
    gradient.addColorStop(0, BUSH_LIGHT_COLOR)
    gradient.addColorStop(1, BUSH_DARK_COLOR)
    context.fillStyle = gradient
    context.beginPath()
    context.arc(x, y, radius, 0, 2 * Math.PI)
    context.fill()
  }
}

/**
 * Draws what sits on the road: dashes, threshold bars, slab joints, bushes. Nothing touches an edge of the tile,
 * so tiles whose edges have the same kind meet without a visible joint.
 */
export function drawSurfaceDetails(context: Context, kind: TileKind, size: number): void {
  if (kind === 'bushes') {
    drawBushes(context, size)
    return
  }
  if (kind === 'apron') {
    drawSlabJoints(context, size, APRON_PAD)
    return
  }
  const taxiwayLine = size * TAXIWAY_LINE_RATIO
  if (kind === 'taxiwayCurve') {
    const offsetRadians = (size * DASH_START_RATIO) / (size / 2)
    context.strokeStyle = TAXIWAY_LINE_COLOR
    context.lineWidth = taxiwayLine
    inEdgeFrame(context, size, 0, () => {
      context.beginPath()
      context.arc(size / 2, -size / 2, size / 2, Math.PI - offsetRadians, Math.PI / 2 + offsetRadians, true)
      context.stroke()
    })
    return
  }
  const edges = TILE_EDGES[kind]
  edges.forEach((edge, index) => {
    if (edge === 'grass') {
      return
    }
    const thickness = edge === 'runway' ? size * RUNWAY_LINE_RATIO : taxiwayLine
    context.fillStyle = edge === 'runway' ? LINE_COLOR : TAXIWAY_LINE_COLOR
    inEdgeFrame(context, size, index, () => {
      context.fillRect(-thickness / 2, -size / 2 + size * DASH_START_RATIO, thickness, size * (DASH_END_RATIO - DASH_START_RATIO))
    })
  })
  if (kind === 'runwayEnd') {
    const barWidth = size * THRESHOLD_BAR_RATIO
    context.fillStyle = LINE_COLOR
    inEdgeFrame(context, size, edges.indexOf('runway'), () => {
      for (const offset of THRESHOLD_BAR_OFFSETS) {
        context.fillRect(offset * size - barWidth / 2, -size / 2 + size * THRESHOLD_START_RATIO, barWidth, size * (THRESHOLD_END_RATIO - THRESHOLD_START_RATIO))
      }
    })
  }
  if (kind === 'taxiwayEndApron') {
    drawSlabJoints(context, size, END_APRON_PAD)
  }
}
