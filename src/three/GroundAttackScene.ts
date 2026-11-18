import * as THREE from 'three'
import { assetUrl } from '../assetUrl'
import { AIRCRAFT_SPRITE_WIDTH_METERS } from './aircraftSprite'
import { Bushes } from './Bushes'
import type { BushPlacement } from './Bushes'
import { D520Model } from './D520Model'
import { DamageEffects } from './DamageEffects'
import { LiveryTextures } from './liveries'
import { createRenderer, disposeScene } from './rendering'
import { SeededRandom } from './SeededRandom'
import { loadTerrainTextures } from './terrainTextures'

export type StrafeOutcome = 'won' | 'escaped'
export type StrafeStatus = { destroyed: number; secondsLeft: number }

type VehicleKind = 'truck' | 'tanker' | 'armored-car' | 'light-tank'
type Vehicle = {
  kind: VehicleKind
  mesh: THREE.Mesh
  position: THREE.Vector2
  fireSeconds: number
  stateIndex: number
}

const DEGREES = Math.PI / 180
const STATES = ['intact', 'damaged', 'destroyed'] as const
const DESTROYED_INDEX = STATES.length - 1
// What the sheet of the convoy shows: the size of each vehicle on the screen, in meters, and how long it has to be under fire, compared with a truck.
const KINDS: Record<VehicleKind, { widthMeters: number; armor: number }> = {
  truck: { widthMeters: 6.2, armor: 1 },
  tanker: { widthMeters: 6.4, armor: 1 },
  'armored-car': { widthMeters: 5, armor: 1.3 },
  'light-tank': { widthMeters: 5.2, armor: 1.6 },
}
const KIND_NAMES = Object.keys(KINDS) as VehicleKind[]
const DAMAGED_AFTER_SECONDS = 0.5
const DESTROYED_AFTER_SECONDS = 1.1
// A tanker that blows up takes the vehicles near it one state down.
const BLAST_RADIUS_METERS = 14
const SPRITES_PATH = 'sprites/convoy/'
// The sprites are drawn for a camera 35 degrees above the ground, turned a half of a right angle, which the camera of the scene has too.
const CAMERA_ELEVATION = 35 * DEGREES
const VIEW_DIRECTION = new THREE.Vector3(-Math.SQRT1_2 * Math.cos(CAMERA_ELEVATION), Math.SQRT1_2 * Math.cos(CAMERA_ELEVATION), -Math.sin(CAMERA_ELEVATION))
const SCREEN_FORWARD = new THREE.Vector2(-Math.SQRT1_2, Math.SQRT1_2)
const CAMERA_DISTANCE_METERS = 300
const VIEW_HEIGHT_METERS = 44
const LOOK_AHEAD_METERS = 26
const SPRITE_BOTTOM_LIFT_SHARE = 0.08

const AIRCRAFT_SPEED_METERS_PER_SECOND = 8
const AIRCRAFT_ALTITUDE_METERS = 9
const AIRCRAFT_SCALE = 1.3
const LATERAL_SPEED_METERS_PER_SECOND = 9
const MAX_X_METERS = 14
const BANK_RADIANS = 0.45
const CONTROL_SMOOTHING_PER_SECOND = 6
const CONVOY_SPEED_METERS_PER_SECOND = 3
const FIRST_VEHICLE_METERS = 70
const VEHICLE_SPACING_METERS = 22
export const STRAFE_VEHICLE_COUNT = 6
export const STRAFE_REQUIRED_DESTROYED = 4
const LANE_OFFSET_METERS = 4
const ROAD_WIDTH_METERS = 10
// The ground the guns cover, ahead of the aircraft, and how much of a vehicle must be in it.
const ZONE_START_METERS = 12
const ZONE_LENGTH_METERS = 24
const ZONE_HALF_WIDTH_METERS = 2.2
const VEHICLE_HALF_WIDTH_METERS = 1.2
// The muzzles of the wing guns, in the frame of the aircraft before it is scaled: out on the wings and ahead of their leading edge, where the tracers start.
const MUZZLES = [new THREE.Vector3(-1.7, 2.5, 0), new THREE.Vector3(1.7, 2.5, 0)]
const TRACER_FLICKER_SECONDS = 0.06
const PASSED_BEHIND_METERS = 10
const END_PAUSE_SECONDS = 1.2
const TIME_LIMIT_SECONDS = 45
const MAX_FRAME_SECONDS = 0.05
const STATUS_INTERVAL_SECONDS = 0.1

const GROUND_WIDTH_METERS = 500
const GROUND_LENGTH_METERS = 900
const GROUND_BACK_METERS = 150
const GRASS_REPEAT_METERS = 40
const GROUND_COLOR_UNTIL_LOADED = 0x6d7231
const ROAD_LIFT_METERS = 0.02
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
const ZONE_COLOR = 0xffd24a
const ZONE_OPACITY = { idle: 0.14, firing: 0.38 }
const SHADOW_OPACITY = 0.35
const FLYING = { engine: 1, gearRetraction: 1, flaps: 0, wheels: 0, aileron: 0, rudder: 0, elevator: 0 }

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
 * A strafing run seen as in Wings, from a camera 35 degrees above the ground turned half a right angle: a road climbs toward the top right, the D.520 flies along it,
 * and a German convoy comes the other way, each vehicle a sprite that goes from intact to damaged to destroyed as the guns, which fire by themselves at what is in front
 * of the aircraft, hit it. The player only steers to one side or the other. Owns its WebGL canvas.
 */
export class GroundAttackScene {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, CAMERA_DISTANCE_METERS * 3)
  private readonly resizeObserver: ResizeObserver
  private readonly player = new D520Model()
  private readonly liveries: LiveryTextures
  private readonly zone: THREE.Mesh
  private readonly shadow: THREE.Mesh
  private readonly tracers: THREE.Line[] = []
  private readonly vehicles: Vehicle[] = []
  private readonly explosions: DamageEffects[] = []
  private readonly textures = new Map<string, THREE.Texture>()
  private readonly screenUp = new THREE.Vector3()
  private readonly position = new THREE.Vector2(0, 0)
  private previousMilliseconds = performance.now()
  private controlX = 0
  private targetX = 0
  private destroyed = 0
  private secondsFlown = 0
  private tracerSeconds = 0
  private statusCountdown = 0
  private endPauseSeconds = 0
  private isReady = false
  private isFiring = false
  private hasEnded = false

  constructor(
    private readonly container: HTMLElement,
    seed: number,
    shadowImage: string,
    private readonly onStatus: (status: StrafeStatus) => void,
    private readonly onEnd: (outcome: StrafeOutcome) => void,
  ) {
    this.renderer = createRenderer(container, false)
    this.liveries = new LiveryTextures(
      this.renderer.capabilities.getMaxAnisotropy(),
      (livery, texture) => {
        if (livery === 'french') {
          this.player.setLivery(texture)
        }
      },
      'low',
      ['french'],
    )
    this.scene.add(new THREE.AmbientLight(LIGHT_COLOR, AMBIENT_LIGHT_INTENSITY))
    const sun = new THREE.DirectionalLight(LIGHT_COLOR, SUN_LIGHT_INTENSITY)
    sun.position.copy(SUN_POSITION)
    this.scene.add(sun)
    this.camera.up.set(0, 0, 1)
    this.placeCamera()
    this.screenUp.set(0, 1, 0).applyQuaternion(this.camera.quaternion)

    this.scene.add(this.createGround(), this.createRoad(), new Bushes(this.bushPlacements(seed)).object)
    this.zone = this.createZone()
    this.shadow = this.createShadow(shadowImage)
    this.createTracers()
    this.player.setState(FLYING)
    this.player.object.scale.setScalar(AIRCRAFT_SCALE)
    this.scene.add(this.player.object)
    void this.createConvoy(seed)

    this.resizeObserver = new ResizeObserver(() => this.fit())
    this.resizeObserver.observe(container)
    this.fit()
    this.renderer.setAnimationLoop(() => this.renderFrame())
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

  /** The ground the guns cover, ahead of the aircraft. */
  private createZone(): THREE.Mesh {
    const zone = new THREE.Mesh(
      new THREE.PlaneGeometry(2 * ZONE_HALF_WIDTH_METERS, ZONE_LENGTH_METERS),
      new THREE.MeshBasicMaterial({ color: ZONE_COLOR, transparent: true, opacity: ZONE_OPACITY.idle, depthWrite: false }),
    )
    zone.position.z = 2 * ROAD_LIFT_METERS
    this.scene.add(zone)
    return zone
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

  /** Two lines from the muzzles of the wing guns, ahead of the wings, down to the middle of the ground they cover, shown while the guns fire. */
  private createTracers(): void {
    const target = new THREE.Vector3(0, ZONE_START_METERS + ZONE_LENGTH_METERS / 2, -AIRCRAFT_ALTITUDE_METERS)
    for (const muzzle of MUZZLES) {
      const geometry = new THREE.BufferGeometry().setFromPoints([muzzle.clone().multiplyScalar(AIRCRAFT_SCALE), target])
      const tracer = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: ZONE_COLOR }))
      tracer.visible = false
      this.scene.add(tracer)
      this.tracers.push(tracer)
    }
  }

  private async createConvoy(seed: number): Promise<void> {
    const loader = new THREE.TextureLoader()
    const names = KIND_NAMES.flatMap((kind) => STATES.map((state) => `${kind}-${state}`))
    await Promise.all(
      names.map(async (name) => {
        const texture = await loader.loadAsync(assetUrl(`${SPRITES_PATH}${name}.png`))
        texture.colorSpace = THREE.SRGBColorSpace
        this.textures.set(name, texture)
      }),
    )
    const random = new SeededRandom(seed)
    const firstLane = random.happens(50) ? 1 : -1
    for (let index = 0; index < STRAFE_VEHICLE_COUNT; index += 1) {
      const kind = random.pickOne(KIND_NAMES)
      const lane = index % 2 === 0 ? firstLane : -firstLane
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }))
      mesh.quaternion.copy(this.camera.quaternion)
      this.scene.add(mesh)
      const vehicle: Vehicle = { kind, mesh, position: new THREE.Vector2(lane * LANE_OFFSET_METERS, FIRST_VEHICLE_METERS + index * VEHICLE_SPACING_METERS), fireSeconds: 0, stateIndex: 0 }
      this.vehicles.push(vehicle)
      this.showVehicle(vehicle)
    }
    this.isReady = true
  }

  /** Puts the sprite of the vehicle, for its state, on the ground where the vehicle is: its foot a little below the point on the road. */
  private showVehicle(vehicle: Vehicle): void {
    const texture = this.textures.get(`${vehicle.kind}-${STATES[vehicle.stateIndex]}`)!
    const image = texture.image as HTMLImageElement
    const widthMeters = KINDS[vehicle.kind].widthMeters
    const heightMeters = (widthMeters * image.height) / image.width
    const material = vehicle.mesh.material as THREE.MeshBasicMaterial
    material.map = texture
    material.needsUpdate = true
    vehicle.mesh.scale.set(widthMeters, heightMeters, 1)
    vehicle.mesh.position.set(vehicle.position.x, vehicle.position.y, 0).addScaledVector(this.screenUp, heightMeters * (0.5 - SPRITE_BOTTOM_LIFT_SHARE))
    vehicle.mesh.renderOrder = Math.round(-vehicle.position.dot(SCREEN_FORWARD) * 10)
  }

  private renderFrame(): void {
    const now = performance.now()
    const deltaSeconds = Math.min((now - this.previousMilliseconds) / 1000, MAX_FRAME_SECONDS)
    this.previousMilliseconds = now
    if (this.isReady && !this.hasEnded) {
      this.moveAircraft(deltaSeconds)
      this.moveConvoy(deltaSeconds)
      this.strafe(deltaSeconds)
      this.checkEnd(deltaSeconds)
    }
    this.showGuns(deltaSeconds)
    this.player.update(deltaSeconds)
    this.explosions.forEach((explosion) => explosion.update(deltaSeconds))
    this.placeCamera()
    this.renderer.render(this.scene, this.camera)
    if (this.isReady && !this.hasEnded) {
      this.reportStatus(deltaSeconds)
    }
  }

  private moveAircraft(deltaSeconds: number): void {
    const smoothing = Math.min(1, deltaSeconds * CONTROL_SMOOTHING_PER_SECOND)
    this.controlX += (this.targetX - this.controlX) * smoothing
    this.position.x = clamp(this.position.x + this.controlX * LATERAL_SPEED_METERS_PER_SECOND * deltaSeconds, -MAX_X_METERS, MAX_X_METERS)
    this.position.y += AIRCRAFT_SPEED_METERS_PER_SECOND * deltaSeconds
    this.secondsFlown += deltaSeconds
    this.player.object.position.set(this.position.x, this.position.y, AIRCRAFT_ALTITUDE_METERS)
    this.player.object.rotation.set(0, this.controlX * BANK_RADIANS, 0, 'ZXY')
    this.shadow.position.x = this.position.x
    this.shadow.position.y = this.position.y
  }

  private moveConvoy(deltaSeconds: number): void {
    for (const vehicle of this.vehicles) {
      if (vehicle.stateIndex < DESTROYED_INDEX) {
        vehicle.position.y -= CONVOY_SPEED_METERS_PER_SECOND * deltaSeconds
        this.showVehicle(vehicle)
      }
    }
  }

  /** The guns fire by themselves at what is in the ground they cover: the longer a vehicle is under fire, the worse its state. */
  private strafe(deltaSeconds: number): void {
    const zoneStart = this.position.y + ZONE_START_METERS
    this.isFiring = false
    for (const vehicle of this.vehicles) {
      const isInZone =
        vehicle.stateIndex < DESTROYED_INDEX &&
        Math.abs(vehicle.position.x - this.position.x) < ZONE_HALF_WIDTH_METERS + VEHICLE_HALF_WIDTH_METERS &&
        vehicle.position.y > zoneStart &&
        vehicle.position.y < zoneStart + ZONE_LENGTH_METERS
      if (isInZone) {
        this.isFiring = true
        vehicle.fireSeconds += deltaSeconds
        this.updateState(vehicle)
      }
    }
  }

  private updateState(vehicle: Vehicle): void {
    const armor = KINDS[vehicle.kind].armor
    let stateIndex = vehicle.stateIndex
    if (vehicle.fireSeconds >= DESTROYED_AFTER_SECONDS * armor) {
      stateIndex = DESTROYED_INDEX
    } else if (vehicle.fireSeconds >= DAMAGED_AFTER_SECONDS * armor) {
      stateIndex = Math.max(stateIndex, 1)
    }
    if (stateIndex !== vehicle.stateIndex) {
      this.setState(vehicle, stateIndex)
    }
  }

  private setState(vehicle: Vehicle, stateIndex: number): void {
    vehicle.stateIndex = stateIndex
    this.showVehicle(vehicle)
    if (stateIndex === DESTROYED_INDEX) {
      this.destroyed += 1
      this.explode(vehicle)
      if (vehicle.kind === 'tanker') {
        this.blast(vehicle)
      }
    }
  }

  private explode(vehicle: Vehicle): void {
    const explosion = new DamageEffects()
    explosion.object.position.set(vehicle.position.x, vehicle.position.y, 0).addScaledVector(this.screenUp, KINDS[vehicle.kind].widthMeters * 0.25)
    explosion.explode()
    this.scene.add(explosion.object)
    this.explosions.push(explosion)
  }

  /** The fuel of a tanker that blows up burns the vehicles close to it: each takes a state down. */
  private blast(tanker: Vehicle): void {
    for (const vehicle of this.vehicles) {
      if (vehicle !== tanker && vehicle.stateIndex < DESTROYED_INDEX && vehicle.position.distanceTo(tanker.position) < BLAST_RADIUS_METERS) {
        const armor = KINDS[vehicle.kind].armor
        vehicle.fireSeconds = Math.max(vehicle.fireSeconds, vehicle.stateIndex === 0 ? DAMAGED_AFTER_SECONDS * armor : DESTROYED_AFTER_SECONDS * armor)
        this.updateState(vehicle)
      }
    }
  }

  /** The ground the guns cover follows the aircraft, and lights up while they fire, with two lines of tracers. */
  private showGuns(deltaSeconds: number): void {
    this.zone.position.set(this.position.x, this.position.y + ZONE_START_METERS + ZONE_LENGTH_METERS / 2, this.zone.position.z)
    ;(this.zone.material as THREE.MeshBasicMaterial).opacity = this.isFiring ? ZONE_OPACITY.firing : ZONE_OPACITY.idle
    this.tracerSeconds += deltaSeconds
    const isLit = this.isFiring && Math.floor(this.tracerSeconds / TRACER_FLICKER_SECONDS) % 2 === 0
    for (const tracer of this.tracers) {
      tracer.visible = isLit
      tracer.position.set(this.position.x, this.position.y, AIRCRAFT_ALTITUDE_METERS)
    }
  }

  private checkEnd(deltaSeconds: number): void {
    const hasAllPassed = this.vehicles.every((vehicle) => vehicle.stateIndex === DESTROYED_INDEX || vehicle.position.y < this.position.y - PASSED_BEHIND_METERS)
    if (hasAllPassed || this.secondsFlown > TIME_LIMIT_SECONDS) {
      this.endPauseSeconds += deltaSeconds
      if (this.endPauseSeconds > END_PAUSE_SECONDS) {
        this.hasEnded = true
        this.onEnd(this.destroyed >= STRAFE_REQUIRED_DESTROYED ? 'won' : 'escaped')
      }
    }
  }

  private reportStatus(deltaSeconds: number): void {
    this.statusCountdown -= deltaSeconds
    if (this.statusCountdown > 0) {
      return
    }
    this.statusCountdown = STATUS_INTERVAL_SECONDS
    this.onStatus({ destroyed: this.destroyed, secondsLeft: Math.max(0, TIME_LIMIT_SECONDS - this.secondsFlown) })
  }
}
