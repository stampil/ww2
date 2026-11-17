import * as THREE from 'three'
import { D520Model } from './D520Model'
import { DamageEffects } from './DamageEffects'
import { DESTROYED_LEVEL } from './damageStages'
import { LiveryTextures } from './liveries'
import { createRenderer, disposeScene, fitToContainer } from './rendering'
import { SeededRandom } from './SeededRandom'
import { createSkyDome, HORIZON_COLOR } from './Sky'
import { loadStaticAircraft } from './StaticAircraft'
import { loadTerrainTextures } from './terrainTextures'

/** The fighters the player can meet from the cockpit. */
export type CockpitEnemy = 'bf109' | 'vichyD520'
export type CockpitOutcome = 'won' | 'escaped'
/** Where the enemy is, seen from the cockpit: degrees to the right and up of the nose, how far, and whether it is in the gunsight. */
export type CockpitSight = { azimuthDegrees: number; elevationDegrees: number; distanceMeters: number; isInSight: boolean }
export type CockpitStatus = { enemyHealth: number; ammunition: number; secondsLeft: number; sight: CockpitSight }
/** `agility` and `accuracy` are the maneuverability of the aircraft and the accuracy of the pilot, from 0 to 1. */
export type CockpitOptions = { enemy: CockpitEnemy; ammunition: number; agility: number; accuracy: number }

type Body = { object: THREE.Object3D; update(deltaSeconds: number): void; damage(level: number): void; destroy(): void; setVelocity(velocity: THREE.Vector3): void }
type Flier = { position: THREE.Vector3; yaw: number; pitch: number; roll: number }
type Bullet = { mesh: THREE.Mesh; velocity: THREE.Vector3; previous: THREE.Vector3; age: number; isActive: boolean }

const DEGREES = Math.PI / 180
const FIELD_OF_VIEW_DEGREES = 70
const CAMERA_NEAR_METERS = 0.05
const CAMERA_FAR_METERS = 5000
// The pilot's eyes, in the frame of the aircraft: behind the gunsight, under the canopy.
const EYE = new THREE.Vector3(0, -0.2, 0.53)
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
const OUT_OF_AMMUNITION_PAUSE_SECONDS = 1.5
const STATUS_INTERVAL_SECONDS = 0.1
const FLYING = { engine: 1, gearRetraction: 1, flaps: 0, wheels: 0, aileron: 0, rudder: 0, elevator: 0 }

const ENEMIES: Record<CockpitEnemy, { speed: number; turnRate: number }> = {
  bf109: { speed: 68, turnRate: 0.75 },
  vichyD520: { speed: 62, turnRate: 0.6 },
}
const ENEMY_HIT_RADIUS_METERS = 4.5
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

const MUZZLES = [new THREE.Vector3(-1.7, 2.5, 0.05), new THREE.Vector3(1.7, 2.5, 0.05)]
const BULLET_POOL = 80
const BULLET_SPEED_METERS_PER_SECOND = 480
const BULLET_LIFE_SECONDS = 1.1
const BULLET_LENGTH_METERS = 7
const BULLET_WIDTH_METERS = 0.18
const BULLET_COLOR = 0xffd24a
const FIRE_INTERVAL_SECONDS = 0.09
const MAX_SPREAD_DEGREES = 1.4
const MIN_SPREAD_SHARE = 0.2
const ENEMY_HEALTH = 100
const DAMAGE_PER_HIT = 7
const HEALTH_PER_DAMAGE_LEVEL = 14
const MAX_DAMAGE_LEVEL_BEFORE_KILL = DESTROYED_LEVEL - 1

const SIGHT_ANGLE_DEGREES = 4
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
const NOSE_AXIS = new THREE.Vector3(0, 1, 0)

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
 * A dogfight flown in real time from the cockpit of the D.520, as in Wings: the player turns to get behind an enemy fighter and fires at it, and sees it
 * take the damage. The aircraft keeps its speed; the player steers it. The accuracy of the pilot tightens the aim, the maneuverability of the aircraft quickens its turns.
 * Owns its WebGL canvas.
 */
export class CockpitCombatScene {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(FIELD_OF_VIEW_DEGREES, 1, CAMERA_NEAR_METERS, CAMERA_FAR_METERS)
  private readonly resizeObserver: ResizeObserver
  private readonly player = new D520Model()
  private readonly liveries: LiveryTextures
  private readonly playerFlight: Flier = { position: new THREE.Vector3(0, 0, START_ALTITUDE_METERS), yaw: 0, pitch: 0, roll: 0 }
  private readonly enemyFlight: Flier = { position: ENEMY_START.clone(), yaw: 0, pitch: 0, roll: 0 }
  private readonly enemyRoot = new THREE.Group()
  private enemy: Body | undefined
  private readonly sky = createSkyDome()
  private readonly ground: THREE.Mesh
  private readonly clouds: THREE.Group[] = []
  private readonly bullets: Bullet[] = []
  private previousMilliseconds = performance.now()
  private controlX = 0
  private controlY = 0
  private targetX = 0
  private targetY = 0
  private isFiring = false
  private fireCooldown = 0
  private nextMuzzle = 0
  private ammunition: number
  private enemyHealth = ENEMY_HEALTH
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
    this.ammunition = options.ammunition
    this.renderer = createRenderer(container, false)
    this.liveries = new LiveryTextures(this.renderer.capabilities.getMaxAnisotropy(), (livery, texture) => {
      if (livery === 'french') {
        this.player.setLivery(texture)
      }
      if (livery === 'vichy' && options.enemy === 'vichyD520') {
        this.vichyBody?.setLivery(texture)
      }
    })
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
    this.scene.add(this.enemyRoot)
    void this.createEnemy()
    this.createBullets()
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

  setFiring(isFiring: boolean): void {
    this.isFiring = isFiring
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
      const meshes = await loadStaticAircraft('bf109')
      const effects = new DamageEffects()
      const root = new THREE.Group()
      root.add(meshes, effects.object)
      this.enemy = {
        object: root,
        update: (deltaSeconds) => effects.update(deltaSeconds),
        damage: (level) => effects.setLevel(level),
        destroy: () => {
          effects.explode()
          meshes.visible = false
        },
        setVelocity: (velocity) => effects.setVelocity(velocity),
      }
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

  private createBullets(): void {
    const geometry = new THREE.BoxGeometry(BULLET_WIDTH_METERS, BULLET_LENGTH_METERS, BULLET_WIDTH_METERS)
    const material = new THREE.MeshBasicMaterial({ color: BULLET_COLOR, fog: false })
    for (let index = 0; index < BULLET_POOL; index += 1) {
      const mesh = new THREE.Mesh(geometry, material)
      mesh.visible = false
      this.scene.add(mesh)
      this.bullets.push({ mesh, velocity: new THREE.Vector3(), previous: new THREE.Vector3(), age: 0, isActive: false })
    }
  }

  private renderFrame(): void {
    const now = performance.now()
    const deltaSeconds = Math.min((now - this.previousMilliseconds) / 1000, MAX_FRAME_SECONDS)
    this.previousMilliseconds = now
    if (!this.hasEnded) {
      this.movePlayer(deltaSeconds)
      this.moveEnemy(deltaSeconds)
      this.fire(deltaSeconds)
      this.moveBullets(deltaSeconds)
      this.checkEnd(deltaSeconds)
    } else {
      this.moveEnemy(deltaSeconds)
      this.moveBullets(deltaSeconds)
    }
    this.player.update(deltaSeconds)
    this.enemy?.update(deltaSeconds)
    this.moveWorld()
    if (!this.hasEnded) {
      this.reportStatus(deltaSeconds)
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

  private fire(deltaSeconds: number): void {
    this.fireCooldown -= deltaSeconds
    if (!this.isFiring || this.ammunition <= 0 || this.fireCooldown > 0) {
      return
    }
    const bullet = this.bullets.find((candidate) => !candidate.isActive)
    if (bullet === undefined) {
      return
    }
    this.fireCooldown = FIRE_INTERVAL_SECONDS
    this.ammunition -= 1
    this.player.object.updateMatrixWorld()
    const muzzle = MUZZLES[this.nextMuzzle].clone()
    this.nextMuzzle = (this.nextMuzzle + 1) % MUZZLES.length
    bullet.previous.copy(this.player.object.localToWorld(muzzle))
    bullet.mesh.position.copy(bullet.previous)
    const spread = MAX_SPREAD_DEGREES * DEGREES * (1 - (1 - MIN_SPREAD_SHARE) * this.options.accuracy)
    const direction = new THREE.Vector3((Math.random() * 2 - 1) * spread, 1, (Math.random() * 2 - 1) * spread).normalize()
    direction.applyQuaternion(this.player.object.quaternion)
    bullet.velocity.copy(direction).multiplyScalar(BULLET_SPEED_METERS_PER_SECOND).addScaledVector(forwardOf(this.playerFlight.yaw, this.playerFlight.pitch), PLAYER_SPEED_METERS_PER_SECOND)
    bullet.mesh.quaternion.setFromUnitVectors(NOSE_AXIS, direction)
    bullet.mesh.visible = true
    bullet.age = 0
    bullet.isActive = true
  }

  private moveBullets(deltaSeconds: number): void {
    for (const bullet of this.bullets) {
      if (!bullet.isActive) {
        continue
      }
      bullet.age += deltaSeconds
      bullet.previous.copy(bullet.mesh.position)
      bullet.mesh.position.addScaledVector(bullet.velocity, deltaSeconds)
      if (bullet.age > BULLET_LIFE_SECONDS) {
        this.retire(bullet)
      } else if (!this.isEnemyDestroyed && this.enemy !== undefined && this.hits(bullet)) {
        this.retire(bullet)
        this.damageEnemy()
      }
    }
  }

  /** Whether the stretch the bullet has just flown goes through the enemy. */
  private hits(bullet: Bullet): boolean {
    const segment = new THREE.Line3(bullet.previous, bullet.mesh.position)
    const closest = segment.closestPointToPoint(this.enemyFlight.position, true, new THREE.Vector3())
    return closest.distanceTo(this.enemyFlight.position) < ENEMY_HIT_RADIUS_METERS
  }

  private retire(bullet: Bullet): void {
    bullet.isActive = false
    bullet.mesh.visible = false
  }

  private damageEnemy(): void {
    this.enemyHealth = Math.max(0, this.enemyHealth - DAMAGE_PER_HIT)
    if (this.enemyHealth === 0) {
      this.isEnemyDestroyed = true
      this.pauseSeconds = KILL_PAUSE_SECONDS
      this.enemy!.destroy()
      return
    }
    this.enemy!.damage(Math.min(MAX_DAMAGE_LEVEL_BEFORE_KILL, Math.floor((ENEMY_HEALTH - this.enemyHealth) / HEALTH_PER_DAMAGE_LEVEL)))
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
    const hasNoBulletLeft = this.ammunition <= 0 && !this.bullets.some((bullet) => bullet.isActive)
    this.pauseSeconds = hasNoBulletLeft ? this.pauseSeconds + deltaSeconds : 0
    if (this.secondsLeft === 0 || distance > ESCAPE_DISTANCE_METERS || this.pauseSeconds > OUT_OF_AMMUNITION_PAUSE_SECONDS) {
      this.end('escaped')
    }
  }

  private end(outcome: CockpitOutcome): void {
    this.hasEnded = true
    this.isFiring = false
    this.reportStatus(STATUS_INTERVAL_SECONDS)
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

  private reportStatus(deltaSeconds: number): void {
    this.statusCountdown -= deltaSeconds
    if (this.statusCountdown > 0) {
      return
    }
    this.statusCountdown = STATUS_INTERVAL_SECONDS
    this.onStatus({ enemyHealth: this.enemyHealth, ammunition: this.ammunition, secondsLeft: this.secondsLeft, sight: this.sight() })
  }

  private sight(): CockpitSight {
    const toEnemy = this.enemyFlight.position.clone().sub(this.playerFlight.position)
    const local = toEnemy.clone().applyQuaternion(this.player.object.quaternion.clone().invert())
    const azimuthDegrees = Math.atan2(local.x, local.y) / DEGREES
    const elevationDegrees = Math.atan2(local.z, Math.hypot(local.x, local.y)) / DEGREES
    const distanceMeters = toEnemy.length()
    const isInSight =
      Math.abs(azimuthDegrees) < SIGHT_ANGLE_DEGREES &&
      Math.abs(elevationDegrees) < SIGHT_ANGLE_DEGREES &&
      distanceMeters >= SIGHT_DISTANCE_METERS.min &&
      distanceMeters <= SIGHT_DISTANCE_METERS.max
    return { azimuthDegrees, elevationDegrees, distanceMeters, isInSight }
  }
}
