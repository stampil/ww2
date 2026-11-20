import * as THREE from 'three'
import { assetUrl } from '../assetUrl'
import type { PlanRunway } from '../plans/runway'
import type { PlacedSprite, TerrainPlan } from '../plans/terrainPlan'
import { TILE_SIZE_METERS } from './airfield'
import { tileCenterOf } from './TileGround'

const DEGREES = Math.PI / 180
const ROUGHNESS = 0.85
const TEXTURE_PIXELS = 128
const TEXTURES_PATH = 'textures/buildings/'
const TEXTURE_ANISOTROPY = 4
// The side, in meters, of what each picture of a material covers before it repeats: its planks, ribs or tiles are as wide as they are on the real thing, a little larger so that they read from afar.
const TILE_METERS = {
  wall: 3,
  plaster: 4,
  concrete: 4,
  corrugated: 6,
  tile: 3,
  olive: 5,
  tan: 5,
  camo: 8,
  wood: 2.4,
  steel: 5,
  darkSteel: 2,
  sandbag: 0.9,
  crate: 1.2,
  truck: 2.5,
  barrel: 0.95,
  rubber: 0.8,
}
// A face whose normal points this much along an axis is flat against it.
const FLAT_NORMAL = 0.99
const SHADOW_SIZE_SHARE = 1.3
// The sun is to the west and north: the shadows fall a little to the east and the south, by this share of the height.
const SHADOW_SHIFT = { x: 0.35, y: -0.25 }
const SHADOW_OPACITY = 0.45
const SHADOW_LIFT_METERS = 0.05
const WINDSOCK_BANDS = 8
const ROUNDEL_RADII = { red: 0.47, white: 0.31, blue: 0.15 }

type TextureName = keyof typeof TILE_METERS
type Textures = Record<TextureName, THREE.Texture>
type Materials = ReturnType<typeof createMaterials>
type Builder = (materials: Materials) => THREE.Group

function canvasTexture(draw: (context: CanvasRenderingContext2D, size: number) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = TEXTURE_PIXELS
  canvas.height = TEXTURE_PIXELS
  draw(canvas.getContext('2d')!, TEXTURE_PIXELS)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  return texture
}

/** The pictures of the materials, tiling seamlessly, scaled so that the coordinates of the shapes, which are in meters, repeat each of them at its own size. */
async function loadTextures(): Promise<Textures> {
  const loader = new THREE.TextureLoader()
  const names = Object.keys(TILE_METERS) as TextureName[]
  const loaded = await Promise.all(names.map((name) => loader.loadAsync(assetUrl(`${TEXTURES_PATH}${name}.jpg`))))
  const textures = {} as Textures
  names.forEach((name, index) => {
    const texture = loaded[index]
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.anisotropy = TEXTURE_ANISOTROPY
    texture.repeat.set(1 / TILE_METERS[name], 1 / TILE_METERS[name])
    textures[name] = texture
  })
  // The ribs of the sheet run down the slope of a roof.
  textures.corrugated.center.set(0.5, 0.5)
  textures.corrugated.rotation = Math.PI / 2
  return textures
}

/** The cocarde that the French aircraft wear, blue in the middle: painted on the roof of the hangar. */
function roundelTexture(): THREE.CanvasTexture {
  return canvasTexture((context, size) => {
    const center = size / 2
    for (const [radius, color] of [[ROUNDEL_RADII.red, '#c8372d'], [ROUNDEL_RADII.white, '#f1ede1'], [ROUNDEL_RADII.blue, '#1d3f8f']] as const) {
      context.fillStyle = color
      context.beginPath()
      context.arc(center, center, radius * size, 0, Math.PI * 2)
      context.fill()
    }
  })
}

/** Red and white bands across the length of a windsock. */
function windsockTexture(): THREE.CanvasTexture {
  return canvasTexture((context, size) => {
    for (let band = 0; band < WINDSOCK_BANDS; band += 1) {
      context.fillStyle = band % 2 === 0 ? '#c6402b' : '#f1ede1'
      context.fillRect(0, (band * size) / WINDSOCK_BANDS, size, size / WINDSOCK_BANDS)
    }
  })
}

/** A dark spot, soft at its edges, that lies on the ground under a building. */
function shadowTexture(): THREE.CanvasTexture {
  return canvasTexture((context, size) => {
    const gradient = context.createRadialGradient(size / 2, size / 2, size * 0.2, size / 2, size / 2, size / 2)
    gradient.addColorStop(0, `rgba(0, 0, 0, ${SHADOW_OPACITY})`)
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, size, size)
  })
}

function paint(color: number, options: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: ROUGHNESS, ...options })
}

/** Each material carries the picture of what it is: cream plaster, grey sheet, red tile, olive and tan canvas, concrete, sandbags, wood. The barrels take their color from the material, over the light and dark of one picture. */
function createMaterials(textures: Textures) {
  const white = 0xffffff
  return {
    wall: paint(white, { map: textures.wall }),
    plaster: paint(white, { map: textures.plaster }),
    concrete: paint(white, { map: textures.concrete }),
    corrugated: paint(white, { map: textures.corrugated }),
    tile: paint(white, { map: textures.tile }),
    olive: paint(white, { map: textures.olive, flatShading: true }),
    tan: paint(white, { map: textures.tan, flatShading: true }),
    camo: paint(white, { map: textures.camo, flatShading: true }),
    wood: paint(white, { map: textures.wood }),
    steel: paint(white, { map: textures.steel, metalness: 0.4, roughness: 0.5 }),
    darkSteel: paint(white, { map: textures.darkSteel, metalness: 0.5, roughness: 0.5 }),
    glass: paint(0x6f8d99, { transparent: true, opacity: 0.8, roughness: 0.2 }),
    dark: paint(0x171715),
    sandbag: paint(white, { map: textures.sandbag }),
    crate: paint(white, { map: textures.crate }),
    green: paint(0x5a6a4a, { map: textures.barrel }),
    blue: paint(0x4f6a80, { map: textures.barrel }),
    rust: paint(0x7a4e32, { map: textures.barrel }),
    truck: paint(white, { map: textures.truck }),
    rubber: paint(white, { map: textures.rubber }),
    roundel: new THREE.MeshStandardMaterial({ map: roundelTexture(), transparent: true, roughness: ROUGHNESS }),
    sock: paint(0xffffff, { map: windsockTexture(), side: THREE.DoubleSide }),
  }
}

/** The texture coordinates of a box, in meters along its faces, so that a picture repeats at the same size on all of them. */
function boxUvs(geometry: THREE.BoxGeometry): void {
  const positions = geometry.getAttribute('position')
  const normals = geometry.getAttribute('normal')
  const uvs = geometry.getAttribute('uv')
  for (let vertex = 0; vertex < positions.count; vertex += 1) {
    if (Math.abs(normals.getX(vertex)) > FLAT_NORMAL) {
      uvs.setXY(vertex, positions.getY(vertex), positions.getZ(vertex))
    } else if (Math.abs(normals.getY(vertex)) > FLAT_NORMAL) {
      uvs.setXY(vertex, positions.getX(vertex), positions.getZ(vertex))
    } else {
      uvs.setXY(vertex, positions.getX(vertex), positions.getY(vertex))
    }
  }
}

/** The texture coordinates, in meters, of a shape extruded along y (a cylinder, a cone, a triangular prism): around its sides, then along them; its ends are seen from above or from the front. */
function extrusionUvs(geometry: THREE.CylinderGeometry, aroundMeters: number, alongMeters: number): void {
  const positions = geometry.getAttribute('position')
  const normals = geometry.getAttribute('normal')
  const uvs = geometry.getAttribute('uv')
  for (let vertex = 0; vertex < positions.count; vertex += 1) {
    if (Math.abs(normals.getY(vertex)) > FLAT_NORMAL) {
      uvs.setXY(vertex, positions.getX(vertex), positions.getZ(vertex))
    } else {
      uvs.setXY(vertex, uvs.getX(vertex) * aroundMeters, uvs.getY(vertex) * alongMeters)
    }
  }
}

/** A block standing on the ground, centered on x and y, its base at z. */
function block(width: number, depth: number, height: number, material: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(width, depth, height)
  boxUvs(geometry)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(x, y, z + height / 2)
  return mesh
}

/** A cylinder standing up, its base at z. */
function column(radiusTop: number, radiusBottom: number, height: number, material: THREE.Material, x = 0, y = 0, z = 0, segments = 20): THREE.Mesh {
  const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments)
  // One length around for the whole height, so that what runs straight up the wall stays straight even where the radius changes.
  extrusionUvs(geometry, Math.PI * (radiusTop + radiusBottom), height)
  geometry.rotateX(Math.PI / 2)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(x, y, z + height / 2)
  return mesh
}

/** A prism with a triangular section, its ridge along y: a tent, or the body of a gable roof, its base at z. */
function prism(width: number, length: number, height: number, material: THREE.Material, z = 0): THREE.Mesh {
  const geometry = new THREE.CylinderGeometry(1, 1, length, 3)
  geometry.scale(width / (2 * Math.sin((120 * DEGREES))), 1, height / 1.5)
  extrusionUvs(geometry, width + 2 * Math.hypot(width / 2, height), length)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.z = z + height / 3
  return mesh
}

/** A gable end: a triangle standing in the plane x z, seen from both sides. */
function gable(width: number, height: number, material: THREE.Material, y: number, z: number): THREE.Mesh {
  const shape = new THREE.Shape([new THREE.Vector2(-width / 2, 0), new THREE.Vector2(width / 2, 0), new THREE.Vector2(0, height)])
  const geometry = new THREE.ShapeGeometry(shape)
  geometry.rotateX(Math.PI / 2)
  const mesh = new THREE.Mesh(geometry, material.clone())
  ;(mesh.material as THREE.Material).side = THREE.DoubleSide
  mesh.position.set(0, y, z)
  return mesh
}

/** The two slopes of a roof whose ridge runs along y; returns them, the one that falls to the east first. */
function gableRoof(group: THREE.Group, span: number, length: number, rise: number, wallHeight: number, material: THREE.Material, overhang = 0.8): THREE.Mesh[] {
  const slopeAngle = Math.atan2(rise, span / 2)
  const slopeLength = Math.hypot(span / 2, rise) + overhang
  const thickness = 0.4
  const slopes = [1, -1].map((side) => {
    const slope = block(slopeLength, length + overhang, thickness, material, (side * span) / 4, 0, wallHeight + rise / 2 - thickness / 2)
    slope.rotation.y = side * slopeAngle
    group.add(slope)
    return slope
  })
  group.add(block(1.2, length + overhang, 0.6, material, 0, 0, wallHeight + rise - 0.2))
  return slopes
}

function barrels(group: THREE.Group, materials: Materials, places: [number, number][]): void {
  const colors = [materials.green, materials.blue, materials.rust]
  places.forEach(([x, y], index) => group.add(column(0.45, 0.45, 0.95, colors[index % colors.length], x, y)))
}

function crates(group: THREE.Group, materials: Materials, places: [number, number, number][]): void {
  places.forEach(([x, y, turn]) => {
    const crate = block(1.4, 1, 0.9, materials.crate, x, y)
    crate.rotation.z = turn * DEGREES
    group.add(crate)
  })
}

/** A wall of sandbags, two high, along the given points, each bag turned a little differently. */
function sandbags(group: THREE.Group, materials: Materials, points: [number, number][], turn: number): void {
  points.forEach(([x, y], index) => {
    for (const level of [0, 1]) {
      const bag = block(1.7, 0.9, 0.55, materials.sandbag, x + (level === 1 ? 0.4 : 0), y, level * 0.55)
      bag.rotation.z = (turn + ((index * 7) % 9) - 4) * DEGREES
      group.add(bag)
    }
  })
}

function hangar(materials: Materials): THREE.Group {
  const group = new THREE.Group()
  const span = 30
  const length = 28
  const wall = 7
  const rise = 5
  group.add(block(span, length, wall, materials.wall))
  const slopes = gableRoof(group, span, length, rise, wall, materials.corrugated)
  const roundel = new THREE.Mesh(new THREE.CircleGeometry(4.2, 32), materials.roundel)
  roundel.position.set(0, -length / 4, 0.21)
  slopes[0].add(roundel)
  group.add(gable(span, rise, materials.wall, -length / 2 - 0.02, wall), gable(span, rise, materials.wall, length / 2 + 0.02, wall))
  group.add(block(20, 0.3, 6, materials.dark, 0, -length / 2 - 0.05))
  for (const side of [-1, 1]) {
    group.add(block(5, 0.6, 6, materials.wall, side * 12.5, -length / 2 - 0.35))
  }
  group.add(block(8, 18, 5, materials.wall, -19, -length / 2 + 9))
  const annexRoof = block(9, 19.4, 0.4, materials.tile, -19, -length / 2 + 9, 5)
  annexRoof.rotation.y = -0.12
  group.add(annexRoof)
  for (const x of [-21.5, -16.5]) {
    group.add(block(1.4, 0.2, 1.4, materials.dark, x, -length / 2 - 0.05, 2))
  }
  barrels(group, materials, [[14, -length / 2 - 2], [15.2, -length / 2 - 3], [13.2, -length / 2 - 3.2]])
  crates(group, materials, [[-24.5, -length / 2 - 1.5, 10], [-26, -length / 2 + 1, -8]])
  return group
}

function tents(materials: Materials): THREE.Group {
  const group = new THREE.Group()
  group.add(block(24, 14, 1.4, materials.camo))
  const main = prism(14, 24, 6.8, materials.camo, 1.4)
  main.rotation.z = Math.PI / 2
  group.add(main)
  group.add(block(10, 12, 1.2, materials.tan, 8, -13))
  group.add(prism(10, 12, 5, materials.tan, 1.2).translateX(8).translateY(-13))
  group.add(block(3, 0.3, 2.4, materials.dark, 8, -19.1))
  crates(group, materials, [[-10, -9, 12], [-8, -10.5, -6], [-13, -8, 4]])
  barrels(group, materials, [[-14, 4], [-15, 5.3], [-13.2, 5.6]])
  return group
}

function depot(materials: Materials): THREE.Group {
  const group = new THREE.Group()
  group.add(block(16, 10, 5, materials.wall, -4, 0))
  const roof = gableRoof(new THREE.Group(), 10, 16, 2.2, 5, materials.corrugated)
  const roofGroup = new THREE.Group()
  roof.forEach((slope) => roofGroup.add(slope))
  roofGroup.add(block(1.2, 16.8, 0.6, materials.corrugated, 0, 0, 7))
  roofGroup.rotation.z = Math.PI / 2
  roofGroup.position.set(-4, 0, 0)
  group.add(roofGroup)
  group.add(block(3, 0.3, 3.4, materials.dark, -4, -5.05))
  for (const [x, radius, height] of [[7, 3.2, 13], [13, 2.4, 9]] as const) {
    group.add(column(radius, radius, height, materials.steel, x, 3))
    group.add(column(0.1, radius + 0.3, 2, materials.steel, x, 3, height))
  }
  barrels(group, materials, [[-12, -8], [-11, -9.2], [-10, -8], [-12.4, -10], [-10.8, -10.4], [-9.4, -9.6]])
  group.add(block(7, 2.5, 0.6, materials.darkSteel, 6, -9, 0.9))
  group.add(block(4, 2.5, 2.2, materials.truck, 7.5, -9, 1.5))
  group.add(block(2.2, 2.5, 2.2, materials.truck, 3.9, -9, 1.5))
  for (const x of [4, 8.6]) {
    for (const y of [-10.3, -7.7]) {
      const wheel = column(0.55, 0.55, 0.4, materials.rubber, x, y, 0.2)
      wheel.rotation.x = Math.PI / 2
      wheel.position.z = 0.55
      group.add(wheel)
    }
  }
  crates(group, materials, [[-1, -8, 5], [-2.4, -9.6, -12]])
  return group
}

function commandPost(materials: Materials): THREE.Group {
  const group = new THREE.Group()
  group.add(block(22, 16, 1.6, materials.olive))
  const main = prism(16, 22, 7.2, materials.olive, 1.6)
  main.rotation.z = Math.PI / 2
  group.add(main)
  group.add(block(8, 8, 1.2, materials.tan, 6, -11))
  group.add(prism(8, 8, 4.4, materials.tan, 1.2).translateX(6).translateY(-11))
  const wall: [number, number][] = []
  for (let x = -12; x <= 12; x += 1.7) {
    wall.push([x, -15.5])
  }
  sandbags(group, materials, wall, 0)
  group.add(column(0.12, 0.12, 16, materials.darkSteel, -13, 3))
  group.add(block(3, 0.12, 0.12, materials.darkSteel, -13, 3, 15))
  crates(group, materials, [[11, 3, 8], [12.8, 4.2, -10]])
  barrels(group, materials, [[-4, -9.5], [-3, -10.6]])
  return group
}

function controlTower(materials: Materials): THREE.Group {
  const group = new THREE.Group()
  group.add(block(7, 7, 11, materials.plaster))
  group.add(block(9, 9, 0.6, materials.concrete, 0, 0, 11))
  group.add(block(7.4, 7.4, 3.6, materials.glass, 0, 0, 11.6))
  for (const [x, y] of [[-3.5, -3.5], [3.5, -3.5], [-3.5, 3.5], [3.5, 3.5]]) {
    group.add(block(0.5, 0.5, 3.6, materials.darkSteel, x, y, 11.6))
  }
  group.add(block(10, 10, 0.6, materials.concrete, 0, 0, 15.2))
  group.add(column(0.12, 0.12, 6, materials.darkSteel, 3.5, 3.5, 15.8))
  group.add(block(16, 8, 5, materials.plaster, 11.5, -1.5))
  const annexRoof = gableRoof(new THREE.Group(), 8, 16, 1.6, 5, materials.corrugated)
  const roofGroup = new THREE.Group()
  annexRoof.forEach((slope) => roofGroup.add(slope))
  roofGroup.rotation.z = Math.PI / 2
  roofGroup.position.set(11.5, -1.5, 0)
  group.add(roofGroup)
  group.add(block(1.6, 0.2, 2.4, materials.dark, 8, -5.6))
  for (const x of [13, 17]) {
    group.add(block(1.4, 0.2, 1.4, materials.dark, x, -5.6, 2))
  }
  const ring: [number, number][] = []
  for (let step = 0; step < 12; step += 1) {
    const angle = Math.PI + (step / 11) * Math.PI
    ring.push([Math.cos(angle) * 6.5, Math.sin(angle) * 6.5 - 1])
  }
  sandbags(group, materials, ring, 90)
  return group
}

function windsock(materials: Materials): THREE.Group {
  const group = new THREE.Group()
  group.add(column(0.18, 0.22, 13, materials.darkSteel))
  const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.3, 5, 16, 1, true), materials.sock)
  sock.rotation.z = -Math.PI / 2
  sock.position.set(2.5, 0, 12)
  group.add(sock)
  group.add(block(6, 5, 3.2, materials.wood, 6, -1))
  const roof = gableRoof(new THREE.Group(), 5, 6, 1.4, 3.2, materials.wood, 0.5)
  const roofGroup = new THREE.Group()
  roof.forEach((slope) => roofGroup.add(slope))
  roofGroup.rotation.z = Math.PI / 2
  roofGroup.position.set(6, -1, 0)
  group.add(roofGroup)
  group.add(block(1.2, 0.2, 2.2, materials.dark, 6, -3.55))
  return group
}

function bunker(materials: Materials): THREE.Group {
  const group = new THREE.Group()
  group.add(column(7, 8, 3.6, materials.concrete, 0, 0, 0, 8))
  group.add(column(5, 5, 0.5, materials.concrete, 0, 0, 3.6, 24))
  for (const x of [-3.5, 3.5]) {
    group.add(block(2.4, 0.4, 1, materials.dark, x, -7.2, 1.4))
  }
  group.add(column(0.9, 1.1, 1.2, materials.darkSteel, 0, 0, 4.1))
  group.add(block(1.8, 1.8, 0.8, materials.darkSteel, 0, 0, 5.3))
  const tilt = 35 * DEGREES
  const barrel = column(0.22, 0.26, 6, materials.darkSteel, 0, 0, 0)
  barrel.rotation.x = Math.PI / 2 - tilt
  barrel.position.set(0, Math.cos(tilt) * 3 + 0.5, 5.9 + Math.sin(tilt) * 3)
  group.add(barrel)
  group.add(block(2.2, 0.2, 1.6, materials.darkSteel, 0, 1, 5.5))
  return group
}

const BUILDERS: Record<string, Builder> = {
  hangar,
  'camouflaged-tents': tents,
  depot,
  'command-post': commandPost,
  'control-tower': controlTower,
  windsock,
  'anti-aircraft-bunker': bunker,
}

/** A building as wide as its tile says, its south wall on the south edge of its tile, the way the pictures of the flat map stand, with its shadow on the ground. */
function placed(model: THREE.Group, sprite: PlacedSprite, runway: PlanRunway, shadow: THREE.Texture): THREE.Group {
  const size = new THREE.Box3().setFromObject(model)
  const width = size.max.x - size.min.x
  const depth = size.max.y - size.min.y
  const height = size.max.z
  model.position.set(-(size.min.x + size.max.x) / 2, -size.min.y, 0)
  const shadowSpot = new THREE.Mesh(new THREE.PlaneGeometry(width * SHADOW_SIZE_SHARE, depth * SHADOW_SIZE_SHARE), new THREE.MeshBasicMaterial({ map: shadow, transparent: true, depthWrite: false }))
  shadowSpot.position.set(height * SHADOW_SHIFT.x, depth / 2 + height * SHADOW_SHIFT.y, SHADOW_LIFT_METERS)
  const wrapper = new THREE.Group()
  wrapper.add(shadowSpot, model)
  wrapper.scale.setScalar((sprite.widthTiles * TILE_SIZE_METERS) / width)
  const tileCenter = tileCenterOf(runway, sprite.row, sprite.column)
  wrapper.position.set(tileCenter.x, tileCenter.y - TILE_SIZE_METERS / 2, 0)
  return wrapper
}

/** The buildings of a plan in 3D: simple shapes, painted with the pictures of their materials, each as wide as its picture was on the flat map. They come once the pictures have loaded. */
export async function createBuildings(plan: TerrainPlan, runway: PlanRunway): Promise<THREE.Group> {
  const materials = createMaterials(await loadTextures())
  const shadow = shadowTexture()
  const buildings = new THREE.Group()
  for (const sprite of plan.sprites) {
    buildings.add(placed(BUILDERS[sprite.sprite](materials), sprite, runway, shadow))
  }
  return buildings
}
