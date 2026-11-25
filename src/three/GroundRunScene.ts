import * as THREE from 'three'
import { assetUrl } from '../assetUrl'
import { AIRCRAFT_SPRITE_WIDTH_METERS } from './aircraftSprite'
import { Bushes } from './Bushes'
import type { BushPlacement } from './Bushes'
import type { AircraftModel3D } from './aircraftModel'
import { createAircraftModel } from './aircraftModels'
import { LiveryTextures } from './liveries'
import type { Livery } from './liveries'
import { createRenderer, disposeScene } from './rendering'
import { SeededRandom } from './SeededRandom'
import { loadTerrainTextures } from './terrainTextures'

export type RunOutcome = 'won' | 'escaped'
export type VehicleKind = 'truck' | 'tanker' | 'armored-car' | 'light-tank' | 'motorcycle'
/** What a run can destroy beside the road, which pays on top of the mission. */
export type RoadsideKind = 'barrels' | 'tent'
/** How a run ended, what it destroyed beside the road, and how many times the aircraft was hit. */
export type RunEnd = { outcome: RunOutcome; roadsideDestroyed: RoadsideKind[]; hits: number }

/** What a run can show on the ground: the vehicles of a convoy, an ambulance of the Red Cross, and a fuel dump and a tent beside the road. */
export type TargetKind = VehicleKind | 'ambulance' | 'barrels' | 'tent'
/** Whose vehicles stand on the ground: the Allies attack German convoys, the Axe French ones. */
export type TargetNationality = 'german' | 'french'

export const VEHICLE_STATES = ['intact', 'damaged', 'destroyed'] as const
export type VehicleState = (typeof VEHICLE_STATES)[number]
// The size of each target on the screen, in meters: its real length and width, seen from a corner.
export const TARGET_WIDTH_METERS: Record<TargetKind, number> = {
  truck: 6.2,
  tanker: 6.4,
  'armored-car': 5,
  'light-tank': 5.2,
  motorcycle: 2.8,
  ambulance: 6.2,
  barrels: 2.8,
  tent: 5.5,
}
export const VEHICLE_KIND_NAMES: VehicleKind[] = ['truck', 'tanker', 'armored-car', 'light-tank', 'motorcycle']
export const AIRCRAFT_ALTITUDE_METERS = 9
export const AIRCRAFT_SCALE = 1.3
export const ROAD_LIFT_METERS = 0.02
export const PASSED_BEHIND_METERS = 10

const DEGREES = Math.PI / 180
const GERMAN_SPRITES_PATH = 'sprites/convoy/'
const SPRITES_PATHS: Record<TargetNationality, string> = { german: GERMAN_SPRITES_PATH, french: 'sprites/convoy-french/' }
// The fuel dump and the tent belong to no army: their pictures are in the folder of the German ones, the first drawn.
const NEUTRAL_KINDS: TargetKind[] = ['barrels', 'tent']
// The sprites are drawn for a camera 35 degrees above the ground, turned a half of a right angle, which the camera of the scene has too.
const CAMERA_ELEVATION = 35 * DEGREES
const VIEW_DIRECTION = new THREE.Vector3(-Math.SQRT1_2 * Math.cos(CAMERA_ELEVATION), Math.SQRT1_2 * Math.cos(CAMERA_ELEVATION), -Math.sin(CAMERA_ELEVATION))
const SCREEN_FORWARD = new THREE.Vector2(-Math.SQRT1_2, Math.SQRT1_2)
const CAMERA_DISTANCE_METERS = 300
const VIEW_HEIGHT_METERS = 44
const LOOK_AHEAD_METERS = 26
const SPRITE_BOTTOM_LIFT_SHARE = 0.08

const AIRCRAFT_SPEED_METERS_PER_SECOND = 8
// The wind pushes the aircraft across the road, this much for each km/h; it blows to the same side for the whole run.
const WIND_PUSH_METERS_PER_SECOND_PER_KPH = 0.04
const LATERAL_SPEED_METERS_PER_SECOND = 9
const MAX_X_METERS = 14
const BANK_RADIANS = 0.45
const CONTROL_SMOOTHING_PER_SECOND = 6
const END_PAUSE_SECONDS = 1.2
const MAX_FRAME_SECONDS = 0.05
const STATUS_INTERVAL_SECONDS = 0.1

const GROUND_WIDTH_METERS = 500
const GROUND_LENGTH_METERS = 900
const GROUND_BACK_METERS = 150
const GRASS_REPEAT_METERS = 40
const GROUND_COLOR_UNTIL_LOADED = 0x6d7231
const ROAD_WIDTH_METERS = 10
const ROAD_TEXTURE_PIXELS = 128
const ROAD_COLOR = '#8c5a34'
const BUSH_COUNT = 140
const BUSH_WIDTH_METERS = { min: 4, max: 9 }
const BUSH_MIN_DISTANCE_METERS = 9
const BUSH_MAX_DISTANCE_METERS = 70
const LIGHT_COLOR = 0xffffff
const AMBIENT_LIGHT_INTENSITY = 1.3
const SUN_LIGHT_INTENSITY = 2.2
const SUN_POSITION = new THREE.Vector3(-30, 20, 60)
const SHADOW_OPACITY = 0.35
const FLYING = { engine: 1, gearRetraction: 1, flaps: 0, wheels: 0, aileron: 0, rudder: 0, elevator: 0 }

/** Which side of the aircraft the wind of a run pushes it to: 1 to its right, -1 to its left, the same for the same run. */
export function windDirectionOf(seed: number): -1 | 1 {
  return seed % 2 === 0 ? 1 : -1
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}

/** A strip of beaten earth with two ruts, drawn on a canvas. */
function roadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = ROAD_TEXTURE_PIXELS
  canvas.height = ROAD_TEXTURE_PIXELS
  const context = canvas.getContext('2d')!
  context.fillStyle = ROAD_COLOR
  context.fillRect(0, 0, ROAD_TEXTURE_PIXELS, ROAD_TEXTURE_PIXELS)
  const random = new SeededRandom(1940)
  for (let speck = 0; speck < 900; speck += 1) {
    const light = random.happens(50)
    context.fillStyle = light ? 'rgba(190, 140, 90, 0.35)' : 'rgba(60, 35, 20, 0.35)'
    context.fillRect(random.integer(0, ROAD_TEXTURE_PIXELS), random.integer(0, ROAD_TEXTURE_PIXELS), random.integer(1, 3), random.integer(1, 3))
  }
  context.fillStyle = 'rgba(60, 35, 20, 0.28)'
  context.fillRect(ROAD_TEXTURE_PIXELS * 0.26, 0, ROAD_TEXTURE_PIXELS * 0.1, ROAD_TEXTURE_PIXELS)
  context.fillRect(ROAD_TEXTURE_PIXELS * 0.64, 0, ROAD_TEXTURE_PIXELS * 0.1, ROAD_TEXTURE_PIXELS)
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/**
 * The scene of the mini-games flown as in Wings, from a camera 35 degrees above the ground turned half a right angle: a road climbs toward the top right, the D.520 flies
 * along it with its shadow on the ground, and the player steers it to one side or the other. A subclass puts the rules on it. Owns its WebGL canvas.
 */
export abstract class GroundRunScene<Status> {
  protected readonly scene = new THREE.Scene()
  protected readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, CAMERA_DISTANCE_METERS * 3)
  protected readonly position = new THREE.Vector2(0, 0)
  protected readonly screenUp = new THREE.Vector3()
  protected secondsFlown = 0
  protected isReady = false
  /** How fast the aircraft flies along the road and across it, in meters per second; a subclass can set its own. */
  protected readonly forwardSpeedMetersPerSecond: number = AIRCRAFT_SPEED_METERS_PER_SECOND
  protected readonly lateralSpeedMetersPerSecond: number = LATERAL_SPEED_METERS_PER_SECOND
  private readonly renderer: THREE.WebGLRenderer
  private readonly resizeObserver: ResizeObserver
  protected readonly player: AircraftModel3D
  private readonly liveries: LiveryTextures
  private readonly shadow: THREE.Mesh
  private readonly textures = new Map<string, THREE.Texture>()
  private previousMilliseconds = performance.now()
  private controlX = 0
  private targetX = 0
  private statusCountdown = 0
  private endPauseSeconds = 0
  private hasEnded = false

  constructor(
    private readonly container: HTMLElement,
    private readonly seed: number,
    shadowImage: string,
    livery: Livery,
    private readonly nationality: TargetNationality,
    private readonly windSpeed: number,
    private readonly onStatus: (status: Status) => void,
    private readonly onEnd: (end: RunEnd) => void,
  ) {
    this.player = createAircraftModel(livery)
    this.renderer = createRenderer(container, false)
    this.liveries = new LiveryTextures(
      this.renderer.capabilities.getMaxAnisotropy(),
      (loaded, texture) => {
        if (loaded === livery) {
          this.player.setLivery(texture)
        }
      },
      'low',
      [livery],
    )
    this.scene.add(new THREE.AmbientLight(LIGHT_COLOR, AMBIENT_LIGHT_INTENSITY))
    const sun = new THREE.DirectionalLight(LIGHT_COLOR, SUN_LIGHT_INTENSITY)
    sun.position.copy(SUN_POSITION)
    this.scene.add(sun)
    this.camera.up.set(0, 0, 1)
    this.placeCamera()
    this.screenUp.set(0, 1, 0).applyQuaternion(this.camera.quaternion)

    this.scene.add(...this.createBackdrop())
    this.shadow = this.createShadow(shadowImage)
    this.player.setState(FLYING)
    this.player.object.scale.setScalar(AIRCRAFT_SCALE)
    this.scene.add(this.player.object)

    this.resizeObserver = new ResizeObserver(() => this.fit())
    this.resizeObserver.observe(container)
  }

  /** What the aircraft flies over: the grass, the road and the bushes. A run that flies elsewhere puts its own, made without anything the subclass sets up, since this runs while the scene is made. */
  protected createBackdrop(): THREE.Object3D[] {
    return [this.createGround(), this.createRoad(), new Bushes(this.bushPlacements(this.seed)).object]
  }

  /** The way the player steers across the road: -1 to the left, 1 to the right. */
  setControls(x: number): void {
    this.targetX = clamp(x, -1, 1)
  }

  dispose(): void {
    this.renderer.setAnimationLoop(null)
    this.resizeObserver.disconnect()
    disposeScene(this.scene, this.renderer)
    this.liveries.dispose()
  }

  /** Moves what the rules play with, in the game, while the run goes on. */
  protected abstract play(deltaSeconds: number): void

  /** Animates what shows, whether the run goes on or is over. */
  protected abstract animate(deltaSeconds: number): void

  /** Whether the run has nothing more to play. */
  protected abstract isOver(): boolean

  protected abstract outcome(): RunOutcome

  /** How many times the aircraft was hit: never, unless something shoots at it in the run. */
  protected hitsTaken(): number {
    return 0
  }

  /** What the run destroyed beside the road: nothing, unless the run has such targets. */
  protected roadsideDestroyed(): RoadsideKind[] {
    return []
  }

  protected abstract currentStatus(): Status

  /** Begins the animation, once the subclass has set up what it plays with. */
  protected start(): void {
    this.fit()
    this.renderer.setAnimationLoop(() => this.renderFrame())
  }

  /** A flat square that faces the camera, to hold the picture of a vehicle. */
  protected createSprite(): THREE.Mesh {
    const sprite = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }))
    sprite.quaternion.copy(this.camera.quaternion)
    this.scene.add(sprite)
    return sprite
  }

  protected async loadSprites(): Promise<void> {
    const loader = new THREE.TextureLoader()
    const kinds = Object.keys(TARGET_WIDTH_METERS) as TargetKind[]
    const sprites = kinds.flatMap((kind) => VEHICLE_STATES.map((state) => ({ name: `${kind}-${state}`, path: this.spritesPathOf(kind) })))
    await Promise.all(
      sprites.map(async ({ name, path }) => {
        const texture = await loader.loadAsync(assetUrl(`${path}${name}.png`))
        texture.colorSpace = THREE.SRGBColorSpace
        this.textures.set(name, texture)
      }),
    )
  }

  private spritesPathOf(kind: TargetKind): string {
    if (NEUTRAL_KINDS.includes(kind)) {
      return GERMAN_SPRITES_PATH
    }
    return SPRITES_PATHS[this.nationality]
  }

  /** Puts the picture of the target, for its state, on the ground where it stands. */
  protected showSprite(sprite: THREE.Mesh, kind: TargetKind, state: VehicleState, position: THREE.Vector2): void {
    this.showPicture(sprite, this.textures.get(`${kind}-${state}`)!, TARGET_WIDTH_METERS[kind], position)
  }

  /** Puts a picture, this wide on the screen, on the ground where its subject stands: its foot a little below the point on the ground. */
  protected showPicture(sprite: THREE.Mesh, texture: THREE.Texture, widthMeters: number, position: THREE.Vector2): void {
    const image = texture.image as HTMLImageElement
    const heightMeters = (widthMeters * image.height) / image.width
    const material = sprite.material as THREE.MeshBasicMaterial
    material.map = texture
    material.needsUpdate = true
    sprite.scale.set(widthMeters, heightMeters, 1)
    sprite.position.set(position.x, position.y, 0).addScaledVector(this.screenUp, heightMeters * (0.5 - SPRITE_BOTTOM_LIFT_SHARE))
    sprite.renderOrder = Math.round(-position.dot(SCREEN_FORWARD) * 10)
  }

  private fit(): void {
    const { clientWidth, clientHeight } = this.container
    this.renderer.setSize(clientWidth, clientHeight, false)
    const halfWidth = ((VIEW_HEIGHT_METERS / 2) * clientWidth) / clientHeight
    this.camera.left = -halfWidth
    this.camera.right = halfWidth
    this.camera.top = VIEW_HEIGHT_METERS / 2
    this.camera.bottom = -VIEW_HEIGHT_METERS / 2
    this.camera.updateProjectionMatrix()
  }

  /** The camera looks at the ground a little ahead of the aircraft, which keeps it at the lower left of the view. */
  private placeCamera(): void {
    const target = new THREE.Vector3(this.position.x, this.position.y + LOOK_AHEAD_METERS, 0)
    this.camera.position.copy(target).addScaledVector(VIEW_DIRECTION, -CAMERA_DISTANCE_METERS)
    this.camera.lookAt(target)
  }

  private createGround(): THREE.Mesh {
    const material = new THREE.MeshBasicMaterial({ color: GROUND_COLOR_UNTIL_LOADED })
    void loadTerrainTextures().then((textures) => {
      const texture = new THREE.Texture(textures.grass)
      texture.wrapS = THREE.RepeatWrapping
      texture.wrapT = THREE.RepeatWrapping
      texture.repeat.set(GROUND_WIDTH_METERS / GRASS_REPEAT_METERS, GROUND_LENGTH_METERS / GRASS_REPEAT_METERS)
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy()
      texture.needsUpdate = true
      material.map = texture
      material.color.set(0xffffff)
      material.needsUpdate = true
    })
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(GROUND_WIDTH_METERS, GROUND_LENGTH_METERS), material)
    ground.position.y = GROUND_LENGTH_METERS / 2 - GROUND_BACK_METERS
    return ground
  }

  private createRoad(): THREE.Mesh {
    const texture = roadTexture()
    texture.repeat.set(1, GROUND_LENGTH_METERS / ROAD_WIDTH_METERS)
    const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH_METERS, GROUND_LENGTH_METERS), new THREE.MeshBasicMaterial({ map: texture }))
    road.position.set(0, GROUND_LENGTH_METERS / 2 - GROUND_BACK_METERS, ROAD_LIFT_METERS)
    return road
  }

  private bushPlacements(seed: number): BushPlacement[] {
    const random = new SeededRandom(seed)
    const placements: BushPlacement[] = []
    for (let index = 0; index < BUSH_COUNT; index += 1) {
      const side = random.happens(50) ? 1 : -1
      placements.push({
        x: side * random.integer(BUSH_MIN_DISTANCE_METERS, BUSH_MAX_DISTANCE_METERS),
        y: random.integer(-GROUND_BACK_METERS, GROUND_LENGTH_METERS - GROUND_BACK_METERS),
        widthMeters: random.integer(BUSH_WIDTH_METERS.min, BUSH_WIDTH_METERS.max),
        turnRadians: random.integer(0, 359) * DEGREES,
      })
    }
    return placements
  }

  /** The shadow on the ground: the picture of the aircraft seen from above, as the flat map draws it, painted black and drawn with some opacity. */
  private createShadow(imageUrl: string): THREE.Mesh {
    const material = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: SHADOW_OPACITY, depthWrite: false })
    const sizeMeters = AIRCRAFT_SPRITE_WIDTH_METERS * AIRCRAFT_SCALE
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(sizeMeters, sizeMeters), material)
    shadow.visible = false
    new THREE.TextureLoader().load(imageUrl, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace
      material.map = texture
      material.needsUpdate = true
      shadow.visible = true
    })
    shadow.position.z = 3 * ROAD_LIFT_METERS
    this.scene.add(shadow)
    return shadow
  }

  private renderFrame(): void {
    const now = performance.now()
    const deltaSeconds = Math.min((now - this.previousMilliseconds) / 1000, MAX_FRAME_SECONDS)
    this.previousMilliseconds = now
    if (this.isReady && !this.hasEnded) {
      this.moveAircraft(deltaSeconds)
      this.play(deltaSeconds)
      this.checkEnd(deltaSeconds)
    }
    this.animate(deltaSeconds)
    this.player.update(deltaSeconds)
    this.placeCamera()
    this.renderer.render(this.scene, this.camera)
    if (this.isReady && !this.hasEnded) {
      this.reportStatus(deltaSeconds)
    }
  }

  private moveAircraft(deltaSeconds: number): void {
    const smoothing = Math.min(1, deltaSeconds * CONTROL_SMOOTHING_PER_SECOND)
    this.controlX += (this.targetX - this.controlX) * smoothing
    const windPush = windDirectionOf(this.seed) * this.windSpeed * WIND_PUSH_METERS_PER_SECOND_PER_KPH
    this.position.x = clamp(this.position.x + (this.controlX * this.lateralSpeedMetersPerSecond + windPush) * deltaSeconds, -MAX_X_METERS, MAX_X_METERS)
    this.position.y += this.forwardSpeedMetersPerSecond * deltaSeconds
    this.secondsFlown += deltaSeconds
    this.player.object.position.set(this.position.x, this.position.y, AIRCRAFT_ALTITUDE_METERS)
    this.player.object.rotation.set(0, this.controlX * BANK_RADIANS, 0, 'ZXY')
    this.shadow.position.x = this.position.x
    this.shadow.position.y = this.position.y
  }

  private checkEnd(deltaSeconds: number): void {
    if (!this.isOver()) {
      return
    }
    this.endPauseSeconds += deltaSeconds
    if (this.endPauseSeconds > END_PAUSE_SECONDS) {
      this.hasEnded = true
      this.onEnd({ outcome: this.outcome(), roadsideDestroyed: this.roadsideDestroyed(), hits: this.hitsTaken() })
    }
  }

  private reportStatus(deltaSeconds: number): void {
    this.statusCountdown -= deltaSeconds
    if (this.statusCountdown > 0) {
      return
    }
    this.statusCountdown = STATUS_INTERVAL_SECONDS
    this.onStatus(this.currentStatus())
  }
}
