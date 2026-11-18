import * as THREE from 'three'
import { D520Model } from './D520Model'
import { DESTROYED_LEVEL } from './damageStages'
import { LiveryTextures } from './liveries'
import { PilotHeadModel } from './PilotHeadModel'
import { createRenderer, disposeScene, fitToContainer } from './rendering'
import { SeededRandom } from './SeededRandom'
import { createSkyDome, HORIZON_COLOR } from './Sky'
import { createStaticEnemy } from './StaticEnemy'
import type { EnemyBody } from './StaticEnemy'
import { loadTerrainTextures } from './terrainTextures'

/** The fighters the player can meet from the cockpit. */
export type CockpitEnemy = 'bf109' | 'vichyD520'
export type CockpitOutcome = 'won' | 'escaped'
/** Where the enemy is, seen from the cockpit: degrees to the right and up of the nose, how far, and whether it is in the gunsight. */
export type CockpitSight = { azimuthDegrees: number; elevationDegrees: number; distanceMeters: number; isInSight: boolean }
/** How far the enemy has been kept in the gunsight, from 0 to 1, and how wide the gunsight is, as a share of the height of the view. */
export type CockpitStatus = { lockShare: number; sightDiameterPercent: number; secondsLeft: number; sight: CockpitSight }
/** `agility` and `accuracy` are the maneuverability of the aircraft and the accuracy of the pilot, from 0 to 1. */
export type CockpitOptions = { enemy: CockpitEnemy; agility: number; accuracy: number }

type Flier = { position: THREE.Vector3; yaw: number; pitch: number; roll: number }

const DEGREES = Math.PI / 180
const FIELD_OF_VIEW_DEGREES = 70
const CAMERA_NEAR_METERS = 0.05
const CAMERA_FAR_METERS = 5000
// The pilot's eyes, in the frame of the aircraft: behind the gunsight, under the canopy.
const EYE = new THREE.Vector3(0, -0.2, 0.53)
// The bust of the pilot, low in the middle of the instrument panel, in the frame of the aircraft.
const HEAD_POSITION = new THREE.Vector3(0, 0.3, 0.1)
const HEAD_SCALE = 2.3
const START_ALTITUDE_METERS = 350
const ENEMY_START = new THREE.Vector3(25, 160, START_ALTITUDE_METERS)
const PLAYER_SPEED_METERS_PER_SECOND = 78
const PITCH_RATE_RADIANS_PER_SECOND = 0.9
const YAW_RATE_RADIANS_PER_SECOND = 0.8
const MIN_AGILITY_SHARE = 0.7
const AGILITY_SHARE_RANGE = 0.6
const MAX_PITCH_RADIANS = 70 * DEGREES
const MIN_ALTITUDE_METERS = 70
const BANK_RADIANS = 40 * DEGREES
const CONTROL_SMOOTHING_PER_SECOND = 6
const MAX_FRAME_SECONDS = 0.05
const COMBAT_SECONDS = 75
const ESCAPE_DISTANCE_METERS = 1500
const KILL_PAUSE_SECONDS = 2.5
const PERCENT = 100
const STATUS_INTERVAL_SECONDS = 0.1
const FLYING = { engine: 1, gearRetraction: 1, flaps: 0, wheels: 0, aileron: 0, rudder: 0, elevator: 0 }

const ENEMIES: Record<CockpitEnemy, { speed: number; turnRate: number }> = {
  bf109: { speed: 68, turnRate: 0.75 },
  vichyD520: { speed: 62, turnRate: 0.6 },
}
const ENEMY_DECISION_SECONDS = { min: 2, max: 4 }
const ENEMY_HUNTED_DECISION_SECONDS = { min: 0.9, max: 1.7 }
const ENEMY_TURN_DEGREES = { calm: 60, hunted: 110 }
const ENEMY_CLIMB_DEGREES = { calm: 12, hunted: 25 }
const ENEMY_HUNTED_DISTANCE_METERS = 260
const ENEMY_HUNTED_CONE_DEGREES = 25
const ENEMY_MIN_ALTITUDE_METERS = 150
const ENEMY_MAX_ALTITUDE_METERS = 600
// Beyond this distance from the player the enemy turns back toward him, within this many degrees, so that the fight goes on.
const ENEMY_RETURN_DISTANCE_METERS = 450
const ENEMY_RETURN_SCATTER_DEGREES = 25
const ENEMY_ARENA_RADIUS_METERS = 1100
const ENEMY_PITCH_RATE_SHARE = 0.6
const ENEMY_BANK_PER_TURN_RATE = 1.1
const ENEMY_MAX_BANK_RADIANS = 45 * DEGREES
const FALL_PITCH_RATE_RADIANS_PER_SECOND = 0.5
const FALL_MAX_PITCH_RADIANS = 70 * DEGREES

// The guns fire by themselves once the enemy has been kept in the gunsight this long; a short slip out of it does not lose the aim.
const LOCK_SECONDS = 1
const LOCK_GRACE_SECONDS = 0.3

const SIGHT_ANGLE_DEGREES = { min: 4, max: 6 }
const SIGHT_DISTANCE_METERS = { min: 30, max: 260 }

const GROUND_SIZE_METERS = 8000
const GROUND_REPEAT_METERS = 80
const GROUND_COLOR_UNTIL_LOADED = 0x6d7231
const FOG_NEAR_METERS = 700
const FOG_FAR_METERS = 3600
const CLOUD_COUNT = 70
const CLOUD_PUFFS = 6
const CLOUD_RANGE_METERS = 1500
const CLOUD_ALTITUDE_METERS = { min: 120, max: 650 }
const CLOUD_PUFF_RADIUS_METERS = { min: 25, max: 60 }
const CLOUD_SPREAD_METERS = 70
const CLOUD_OPACITY = 0.92
const CLOUD_SEED = 1940
const RANDOM_RESOLUTION = 10000
const LIGHT_COLOR = 0xffffff
const AMBIENT_LIGHT_INTENSITY = 1.4
const SUN_LIGHT_INTENSITY = 2.2
const SUN_POSITION = new THREE.Vector3(-300, 200, 600)

function fractionOf(random: SeededRandom): number {
  return random.integer(0, RANDOM_RESOLUTION) / RANDOM_RESOLUTION
}

function between(range: { min: number; max: number }): number {
  return range.min + Math.random() * (range.max - range.min)
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}

/** The shortest way round from one angle to another. */
function turnBetween(fromAngle: number, toAngle: number): number {
  return Math.atan2(Math.sin(toAngle - fromAngle), Math.cos(toAngle - fromAngle))
}

/** The way an aircraft points: nose along +y turned by its yaw (counterclockwise seen from above) and its pitch. */
function forwardOf(yaw: number, pitch: number): THREE.Vector3 {
  return new THREE.Vector3(-Math.sin(yaw) * Math.cos(pitch), Math.cos(yaw) * Math.cos(pitch), Math.sin(pitch))
}

function place(object: THREE.Object3D, flier: Flier): void {
  object.position.copy(flier.position)
  object.rotation.set(flier.pitch, flier.roll, flier.yaw, 'ZXY')
}

/**
 * A dogfight flown in real time from the cockpit of the D.520, as in Wings: the player turns to get behind an enemy fighter and keeps it in the gunsight, and after
 * a second the guns fire by themselves and it blows up. The aircraft keeps its speed; the player steers it. The accuracy of the pilot widens the gunsight, the maneuverability
 * of the aircraft quickens its turns. Owns its WebGL canvas.
 */
export class CockpitCombatScene {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(FIELD_OF_VIEW_DEGREES, 1, CAMERA_NEAR_METERS, CAMERA_FAR_METERS)
  private readonly resizeObserver: ResizeObserver
  private readonly player = new D520Model()
  private readonly head = new PilotHeadModel()
  private readonly liveries: LiveryTextures
  private readonly playerFlight: Flier = { position: new THREE.Vector3(0, 0, START_ALTITUDE_METERS), yaw: 0, pitch: 0, roll: 0 }
  private readonly enemyFlight: Flier = { position: ENEMY_START.clone(), yaw: 0, pitch: 0, roll: 0 }
  private readonly enemyRoot = new THREE.Group()
  private enemy: EnemyBody | undefined
  private readonly sky = createSkyDome()
  private readonly ground: THREE.Mesh
  private readonly clouds: THREE.Group[] = []
  private previousMilliseconds = performance.now()
  private controlX = 0
  private controlY = 0
  private targetX = 0
  private targetY = 0
  private lockSeconds = 0
  private outOfSightSeconds = 0
  private damageLevel = 0
  private enemyLevel = 0
  private enemyDecisionSeconds = 0
  private enemyTargetYaw = 0
  private enemyTargetPitch = 0
  private enemyYawRate = 0
  private secondsLeft = COMBAT_SECONDS
  private statusCountdown = 0
  private pauseSeconds = 0
  private isEnemyDestroyed = false
  private hasEnded = false

  constructor(
    private readonly container: HTMLElement,
    private readonly options: CockpitOptions,
    private readonly onStatus: (status: CockpitStatus) => void,
    private readonly onEnd: (outcome: CockpitOutcome) => void,
  ) {
    this.renderer = createRenderer(container, false)
    this.liveries = new LiveryTextures(this.renderer.capabilities.getMaxAnisotropy(), (livery, texture) => {
      if (livery === 'french') {
        this.player.setLivery(texture)
      }
      if (livery === 'vichy' && options.enemy === 'vichyD520') {
        this.vichyBody?.setLivery(texture)
      }
    }, 'low')
    this.scene.background = new THREE.Color(HORIZON_COLOR)
    this.scene.fog = new THREE.Fog(HORIZON_COLOR, FOG_NEAR_METERS, FOG_FAR_METERS)
    this.sky.renderOrder = -1
    this.scene.add(this.sky)
    this.ground = this.createGround()
    this.scene.add(this.ground)
    this.addClouds()
    this.scene.add(new THREE.AmbientLight(LIGHT_COLOR, AMBIENT_LIGHT_INTENSITY))
    const sun = new THREE.DirectionalLight(LIGHT_COLOR, SUN_LIGHT_INTENSITY)
    sun.position.copy(SUN_POSITION)
    this.scene.add(sun)

    this.player.setState(FLYING)
    this.scene.add(this.player.object)
    this.camera.position.copy(EYE)
    this.camera.rotation.set(Math.PI / 2, 0, 0)
    this.player.object.add(this.camera)
    this.head.object.position.copy(HEAD_POSITION)
    this.head.object.scale.setScalar(HEAD_SCALE)
    this.player.object.add(this.head.object)
    this.scene.add(this.enemyRoot)
    void this.createEnemy()
    this.enemyTargetYaw = this.enemyFlight.yaw

    this.resizeObserver = new ResizeObserver(() => fitToContainer(this.renderer, this.camera, this.container))
    this.resizeObserver.observe(container)
    fitToContainer(this.renderer, this.camera, container)
    this.renderer.setAnimationLoop(() => this.renderFrame())
  }

  /** The way the player steers: -1 to 1, to the left or right, and down or up; the aircraft turns toward it as long as it is held. */
  setControls(x: number, y: number): void {
    this.targetX = clamp(x, -1, 1)
    this.targetY = clamp(y, -1, 1)
  }

  dispose(): void {
    this.renderer.setAnimationLoop(null)
    this.resizeObserver.disconnect()
    disposeScene(this.scene, this.renderer)
    this.liveries.dispose()
  }

  private vichyBody: D520Model | undefined

  private async createEnemy(): Promise<void> {
    if (this.options.enemy === 'bf109') {
      this.enemy = await createStaticEnemy('bf109')
    } else {
      const model = new D520Model()
      model.setState(FLYING)
      const texture = this.liveries.get('vichy')
      if (texture !== undefined) {
        model.setLivery(texture)
      }
      this.vichyBody = model
      this.enemy = {
        object: model.object,
        update: (deltaSeconds) => model.update(deltaSeconds),
        damage: (level) => {
          while (this.enemyLevel < level) {
            this.enemyLevel += 1
            model.inflictDamage()
          }
        },
        destroy: () => {
          while (this.enemyLevel < DESTROYED_LEVEL) {
            this.enemyLevel += 1
            model.inflictDamage()
          }
        },
        setVelocity: (velocity) => model.setVelocity(velocity),
      }
    }
    this.enemy.setVelocity(new THREE.Vector3(0, ENEMIES[this.options.enemy].speed, 0))
    this.enemyRoot.add(this.enemy.object)
  }

  private createGround(): THREE.Mesh {
    const material = new THREE.MeshBasicMaterial({ color: GROUND_COLOR_UNTIL_LOADED })
    void loadTerrainTextures().then((textures) => {
      const texture = new THREE.Texture(textures.grass)
      texture.wrapS = THREE.RepeatWrapping
      texture.wrapT = THREE.RepeatWrapping
      texture.repeat.set(GROUND_SIZE_METERS / GROUND_REPEAT_METERS, GROUND_SIZE_METERS / GROUND_REPEAT_METERS)
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy()
      texture.needsUpdate = true
      material.map = texture
      material.color.set(0xffffff)
      material.needsUpdate = true
    })
    return new THREE.Mesh(new THREE.PlaneGeometry(GROUND_SIZE_METERS, GROUND_SIZE_METERS), material)
  }

  private addClouds(): void {
    const random = new SeededRandom(CLOUD_SEED)
    const puff = new THREE.IcosahedronGeometry(1, 1)
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: CLOUD_OPACITY, fog: false })
    for (let index = 0; index < CLOUD_COUNT; index += 1) {
      const cloud = new THREE.Group()
      for (let place = 0; place < CLOUD_PUFFS; place += 1) {
        const mesh = new THREE.Mesh(puff, material)
        mesh.position.set((fractionOf(random) - 0.5) * 2 * CLOUD_SPREAD_METERS, (fractionOf(random) - 0.5) * 2 * CLOUD_SPREAD_METERS, (fractionOf(random) - 0.5) * CLOUD_SPREAD_METERS)
        mesh.scale.setScalar(CLOUD_PUFF_RADIUS_METERS.min + fractionOf(random) * (CLOUD_PUFF_RADIUS_METERS.max - CLOUD_PUFF_RADIUS_METERS.min))
        cloud.add(mesh)
      }
      cloud.position.set(
        (fractionOf(random) * 2 - 1) * CLOUD_RANGE_METERS,
        (fractionOf(random) * 2 - 1) * CLOUD_RANGE_METERS,
        CLOUD_ALTITUDE_METERS.min + fractionOf(random) * (CLOUD_ALTITUDE_METERS.max - CLOUD_ALTITUDE_METERS.min),
      )
      this.clouds.push(cloud)
      this.scene.add(cloud)
    }
  }

  private renderFrame(): void {
    const now = performance.now()
    const deltaSeconds = Math.min((now - this.previousMilliseconds) / 1000, MAX_FRAME_SECONDS)
    this.previousMilliseconds = now
    if (!this.hasEnded) {
      this.movePlayer(deltaSeconds)
    }
    this.moveEnemy(deltaSeconds)
    const sight = this.sight()
    if (!this.hasEnded) {
      this.updateLock(deltaSeconds, sight)
      this.checkEnd(deltaSeconds)
    }
    this.head.look(sight.azimuthDegrees, sight.elevationDegrees, deltaSeconds)
    this.player.update(deltaSeconds)
    this.enemy?.update(deltaSeconds)
    this.moveWorld()
    if (!this.hasEnded) {
      this.reportStatus(deltaSeconds, sight)
    }
    this.renderer.render(this.scene, this.camera)
  }

  private movePlayer(deltaSeconds: number): void {
    const smoothing = Math.min(1, deltaSeconds * CONTROL_SMOOTHING_PER_SECOND)
    this.controlX += (this.targetX - this.controlX) * smoothing
    this.controlY += (this.targetY - this.controlY) * smoothing
    const agilityShare = MIN_AGILITY_SHARE + AGILITY_SHARE_RANGE * this.options.agility
    const flight = this.playerFlight
    flight.yaw -= this.controlX * YAW_RATE_RADIANS_PER_SECOND * agilityShare * deltaSeconds
    flight.pitch = clamp(flight.pitch + this.controlY * PITCH_RATE_RADIANS_PER_SECOND * deltaSeconds, -MAX_PITCH_RADIANS, MAX_PITCH_RADIANS)
    flight.roll = this.controlX * BANK_RADIANS
    flight.position.addScaledVector(forwardOf(flight.yaw, flight.pitch), PLAYER_SPEED_METERS_PER_SECOND * deltaSeconds)
    if (flight.position.z < MIN_ALTITUDE_METERS) {
      flight.position.z = MIN_ALTITUDE_METERS
      flight.pitch = Math.max(flight.pitch, 0)
    }
    place(this.player.object, flight)
  }

  private moveEnemy(deltaSeconds: number): void {
    if (this.enemy === undefined) {
      return
    }
    const kind = ENEMIES[this.options.enemy]
    const flight = this.enemyFlight
    if (this.isEnemyDestroyed) {
      flight.pitch = Math.max(flight.pitch - FALL_PITCH_RATE_RADIANS_PER_SECOND * deltaSeconds, -FALL_MAX_PITCH_RADIANS)
      flight.roll += deltaSeconds * 2
    } else {
      this.steerEnemy(deltaSeconds, kind.turnRate)
    }
    flight.position.addScaledVector(forwardOf(flight.yaw, flight.pitch), kind.speed * deltaSeconds)
    flight.position.z = Math.max(flight.position.z, 0)
    place(this.enemyRoot, flight)
  }

  /** The enemy flies on in easy turns, and breaks hard and often when the player is behind it and close. */
  private steerEnemy(deltaSeconds: number, turnRate: number): void {
    const flight = this.enemyFlight
    this.enemyDecisionSeconds -= deltaSeconds
    if (this.enemyDecisionSeconds <= 0) {
      const isHunted = this.isEnemyHunted()
      const turnDegrees = isHunted ? ENEMY_TURN_DEGREES.hunted : ENEMY_TURN_DEGREES.calm
      const climbDegrees = isHunted ? ENEMY_CLIMB_DEGREES.hunted : ENEMY_CLIMB_DEGREES.calm
      this.enemyTargetYaw = flight.yaw + (Math.random() * 2 - 1) * turnDegrees * DEGREES
      this.enemyTargetPitch = (Math.random() * 2 - 1) * climbDegrees * DEGREES
      this.enemyDecisionSeconds = between(isHunted ? ENEMY_HUNTED_DECISION_SECONDS : ENEMY_DECISION_SECONDS)
      if (flight.position.z < ENEMY_MIN_ALTITUDE_METERS) {
        this.enemyTargetPitch = climbDegrees * DEGREES
      } else if (flight.position.z > ENEMY_MAX_ALTITUDE_METERS) {
        this.enemyTargetPitch = -climbDegrees * DEGREES
      }
      const fromCenter = new THREE.Vector2(flight.position.x, flight.position.y)
      if (fromCenter.length() > ENEMY_ARENA_RADIUS_METERS) {
        this.enemyTargetYaw = Math.atan2(fromCenter.x, -fromCenter.y)
      }
      const toPlayer = this.playerFlight.position.clone().sub(flight.position)
      if (toPlayer.length() > ENEMY_RETURN_DISTANCE_METERS) {
        this.enemyTargetYaw = Math.atan2(-toPlayer.x, toPlayer.y) + (Math.random() * 2 - 1) * ENEMY_RETURN_SCATTER_DEGREES * DEGREES
      }
    }
    const yawStep = clamp(turnBetween(flight.yaw, this.enemyTargetYaw), -turnRate * deltaSeconds, turnRate * deltaSeconds)
    const pitchStep = clamp(this.enemyTargetPitch - flight.pitch, -turnRate * ENEMY_PITCH_RATE_SHARE * deltaSeconds, turnRate * ENEMY_PITCH_RATE_SHARE * deltaSeconds)
    flight.yaw += yawStep
    flight.pitch += pitchStep
    this.enemyYawRate = yawStep / deltaSeconds
    flight.roll = clamp(-this.enemyYawRate * ENEMY_BANK_PER_TURN_RATE, -ENEMY_MAX_BANK_RADIANS, ENEMY_MAX_BANK_RADIANS)
  }

  /** Whether the player is close behind the enemy and nearly in line with it. */
  private isEnemyHunted(): boolean {
    const toPlayer = this.playerFlight.position.clone().sub(this.enemyFlight.position)
    const enemyForward = forwardOf(this.enemyFlight.yaw, this.enemyFlight.pitch)
    const distance = toPlayer.length()
    const isBehind = toPlayer.dot(enemyForward) < 0
    const angleFromTail = Math.acos(clamp(-toPlayer.normalize().dot(enemyForward), -1, 1))
    return isBehind && distance < ENEMY_HUNTED_DISTANCE_METERS && angleFromTail < ENEMY_HUNTED_CONE_DEGREES * DEGREES
  }

  /** Counts the time the enemy is in the gunsight: it smokes more and more, and after a second it is shot down. */
  private updateLock(deltaSeconds: number, sight: CockpitSight): void {
    if (this.enemy === undefined || this.isEnemyDestroyed) {
      return
    }
    if (sight.isInSight) {
      this.outOfSightSeconds = 0
      this.lockSeconds += deltaSeconds
    } else {
      this.outOfSightSeconds += deltaSeconds
      if (this.outOfSightSeconds > LOCK_GRACE_SECONDS) {
        this.lockSeconds = 0
      }
    }
    if (this.lockSeconds >= LOCK_SECONDS) {
      this.isEnemyDestroyed = true
      this.pauseSeconds = KILL_PAUSE_SECONDS
      this.enemy.destroy()
      return
    }
    const level = Math.floor((this.lockSeconds / LOCK_SECONDS) * DESTROYED_LEVEL)
    if (level > this.damageLevel) {
      this.damageLevel = level
      this.enemy.damage(level)
    }
  }

  private checkEnd(deltaSeconds: number): void {
    this.secondsLeft = Math.max(0, this.secondsLeft - deltaSeconds)
    if (this.isEnemyDestroyed) {
      this.pauseSeconds -= deltaSeconds
      if (this.pauseSeconds <= 0) {
        this.end('won')
      }
      return
    }
    const distance = this.playerFlight.position.distanceTo(this.enemyFlight.position)
    if (this.secondsLeft === 0 || distance > ESCAPE_DISTANCE_METERS) {
      this.end('escaped')
    }
  }

  private end(outcome: CockpitOutcome): void {
    this.hasEnded = true
    this.onEnd(outcome)
  }

  /** The sky, the ground and the clouds stay around the player, the clouds coming back at the front when they have been left far behind. */
  private moveWorld(): void {
    const position = this.playerFlight.position
    this.sky.position.copy(position)
    this.ground.position.set(Math.round(position.x / GROUND_REPEAT_METERS) * GROUND_REPEAT_METERS, Math.round(position.y / GROUND_REPEAT_METERS) * GROUND_REPEAT_METERS, 0)
    for (const cloud of this.clouds) {
      for (const axis of ['x', 'y'] as const) {
        const offset = cloud.position[axis] - position[axis]
        if (Math.abs(offset) > CLOUD_RANGE_METERS) {
          cloud.position[axis] -= Math.sign(offset) * 2 * CLOUD_RANGE_METERS
        }
      }
    }
  }

  private reportStatus(deltaSeconds: number, sight: CockpitSight): void {
    this.statusCountdown -= deltaSeconds
    if (this.statusCountdown > 0) {
      return
    }
    this.statusCountdown = STATUS_INTERVAL_SECONDS
    this.onStatus({ lockShare: Math.min(this.lockSeconds / LOCK_SECONDS, 1), sightDiameterPercent: (Math.tan(this.sightAngleDegrees() * DEGREES) / Math.tan((FIELD_OF_VIEW_DEGREES / 2) * DEGREES)) * PERCENT, secondsLeft: this.secondsLeft, sight })
  }

  private sight(): CockpitSight {
    const toEnemy = this.enemyFlight.position.clone().sub(this.playerFlight.position)
    const local = toEnemy.clone().applyQuaternion(this.player.object.quaternion.clone().invert())
    const azimuthDegrees = Math.atan2(local.x, local.y) / DEGREES
    const elevationDegrees = Math.atan2(local.z, Math.hypot(local.x, local.y)) / DEGREES
    const distanceMeters = toEnemy.length()
    const isInSight = Math.hypot(azimuthDegrees, elevationDegrees) < this.sightAngleDegrees() && distanceMeters >= SIGHT_DISTANCE_METERS.min && distanceMeters <= SIGHT_DISTANCE_METERS.max
    return { azimuthDegrees, elevationDegrees, distanceMeters, isInSight }
  }

  /** The half angle of the gunsight: the better the pilot aims, the wider it is. */
  private sightAngleDegrees(): number {
    return SIGHT_ANGLE_DEGREES.min + (SIGHT_ANGLE_DEGREES.max - SIGHT_ANGLE_DEGREES.min) * this.options.accuracy
  }
}
