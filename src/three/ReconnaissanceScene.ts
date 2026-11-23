import * as THREE from 'three'
import { assetUrl } from '../assetUrl'
import { GroundRunScene, PASSED_BEHIND_METERS, ROAD_LIFT_METERS, VEHICLE_KIND_NAMES } from './GroundRunScene'
import type { RunOutcome, TargetNationality } from './GroundRunScene'
import type { Livery } from './liveries'
import { SeededRandom } from './SeededRandom'

export type PhotoStatus = { photos: number; detection: number }

type Target = {
  position: THREE.Vector2
  ring: THREE.Mesh
  isPhotographed: boolean
}

type Tower = {
  position: THREE.Vector2
  ring: THREE.Mesh
  hasSeen: boolean
}

export const PHOTO_TARGET_COUNT = 5
export const PHOTO_REQUIRED = 3
export const DETECTION_LIMIT = 100
// An aircraft is seen only by a tower it flies over: this much more of the detection for each, so that two towers give it away.
export const DETECTION_PER_TOWER = 50
// The reconnaissance flies faster than the other runs, for a photo still has to be held for a moment in the frame.
const FORWARD_SPEED_METERS_PER_SECOND = 12
const LATERAL_SPEED_METERS_PER_SECOND = 12
const TOWER_PICTURE_URL = 'sprites/buildings/control-tower.png'
const TOWER_WIDTH_METERS = 7
const TOWER_SEEN_RADIUS_METERS = 5
const TOWER_SPREAD_METERS = 8
const FIRST_TARGET_METERS = 60
const TARGET_SPACING_METERS = 32
const TARGET_JITTER_METERS = 4
const TARGET_SIDE_METERS = { min: 6, max: 12 }
// The ground a photo takes in, ahead of the aircraft, and how long a target has to stay in it for the photo to be taken.
const FRAME_AHEAD_METERS = 14
const FRAME_HALF_LENGTH_METERS = 7
const FRAME_HALF_WIDTH_METERS = 7
const LOCK_SECONDS = 0.6
const FLASH_SECONDS = 0.25
const FRAME_OPACITY = { idle: 0.1, locking: 0.3, flash: 0.9 }
const FRAME_COLOR = 0xffffff
const RING_RADIUS_METERS = { inner: 3.4, outer: 4 }
const RING_THICKNESS_METERS = RING_RADIUS_METERS.outer - RING_RADIUS_METERS.inner
const RING_SEGMENTS = 32
const RING_COLORS = { waiting: 0xffd24a, photographed: 0x35aa46, tower: 0xc94e36 }
const RING_SEEN_OPACITY = 0.35

/**
 * A reconnaissance over enemy ground, as in Until the Last Plane: five vehicles stand off the road, and the frame of the camera ahead of the aircraft takes a photo of
 * the one it holds for a moment. Towers stand between them: the aircraft that flies over one is seen, and when the detection is full, it is caught.
 */
export class ReconnaissanceScene extends GroundRunScene<PhotoStatus> {
  private readonly frame: THREE.Mesh
  protected readonly forwardSpeedMetersPerSecond = FORWARD_SPEED_METERS_PER_SECOND
  protected readonly lateralSpeedMetersPerSecond = LATERAL_SPEED_METERS_PER_SECOND
  private readonly targets: Target[] = []
  private readonly towers: Tower[] = []
  private lockedTarget: Target | undefined
  private lockSeconds = 0
  private flashSeconds = 0
  private photos = 0
  private detection = 0

  constructor(
    container: HTMLElement,
    seed: number,
    shadowImage: string,
    livery: Livery,
    nationality: TargetNationality,
    onStatus: (status: PhotoStatus) => void,
    onEnd: (outcome: RunOutcome) => void,
  ) {
    super(container, seed, shadowImage, livery, nationality, onStatus, onEnd)
    this.frame = this.createFrame()
    void this.createTargets(seed)
    this.start()
  }

  protected play(deltaSeconds: number): void {
    this.seeAircraftOverTowers()
    const target = this.targetInFrame()
    if (target !== this.lockedTarget) {
      this.lockedTarget = target
      this.lockSeconds = 0
    }
    if (target === undefined) {
      return
    }
    this.lockSeconds += deltaSeconds
    if (this.lockSeconds >= LOCK_SECONDS) {
      this.photograph(target)
    }
  }

  protected animate(deltaSeconds: number): void {
    this.flashSeconds = Math.max(0, this.flashSeconds - deltaSeconds)
    this.frame.position.set(this.position.x, this.position.y + FRAME_AHEAD_METERS, this.frame.position.z)
    const lockShare = this.lockedTarget === undefined ? 0 : this.lockSeconds / LOCK_SECONDS
    const flashShare = this.flashSeconds / FLASH_SECONDS
    const lockOpacity = FRAME_OPACITY.idle + (FRAME_OPACITY.locking - FRAME_OPACITY.idle) * lockShare
    ;(this.frame.material as THREE.MeshBasicMaterial).opacity = lockOpacity + (FRAME_OPACITY.flash - lockOpacity) * flashShare
  }

  protected isOver(): boolean {
    const hasAllPassed = this.targets.every((target) => target.isPhotographed || target.position.y < this.position.y - PASSED_BEHIND_METERS)
    return hasAllPassed || this.detection >= DETECTION_LIMIT
  }

  protected outcome(): RunOutcome {
    return this.detection < DETECTION_LIMIT && this.photos >= PHOTO_REQUIRED ? 'won' : 'escaped'
  }

  protected currentStatus(): PhotoStatus {
    return { photos: this.photos, detection: this.detection }
  }

  /** The ground a photo takes in, with its outline: it follows the aircraft, and lights up as a target is held, then flashes when the photo is taken. */
  private createFrame(): THREE.Mesh {
    const frame = new THREE.Mesh(
      new THREE.PlaneGeometry(2 * FRAME_HALF_WIDTH_METERS, 2 * FRAME_HALF_LENGTH_METERS),
      new THREE.MeshBasicMaterial({ color: FRAME_COLOR, transparent: true, opacity: FRAME_OPACITY.idle, depthWrite: false }),
    )
    const corners = [
      new THREE.Vector3(-FRAME_HALF_WIDTH_METERS, -FRAME_HALF_LENGTH_METERS, 0),
      new THREE.Vector3(FRAME_HALF_WIDTH_METERS, -FRAME_HALF_LENGTH_METERS, 0),
      new THREE.Vector3(FRAME_HALF_WIDTH_METERS, FRAME_HALF_LENGTH_METERS, 0),
      new THREE.Vector3(-FRAME_HALF_WIDTH_METERS, FRAME_HALF_LENGTH_METERS, 0),
    ]
    frame.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(corners), new THREE.LineBasicMaterial({ color: FRAME_COLOR })))
    frame.position.z = 2 * ROAD_LIFT_METERS
    this.scene.add(frame)
    return frame
  }

  private async createTargets(seed: number): Promise<void> {
    await this.loadSprites()
    const towerTexture = await new THREE.TextureLoader().loadAsync(assetUrl(TOWER_PICTURE_URL))
    towerTexture.colorSpace = THREE.SRGBColorSpace
    const random = new SeededRandom(seed)
    const firstSide = random.happens(50) ? 1 : -1
    for (let index = 0; index < PHOTO_TARGET_COUNT; index += 1) {
      const side = index % 2 === 0 ? firstSide : -firstSide
      const kind = random.pickOne(VEHICLE_KIND_NAMES)
      const position = new THREE.Vector2(
        side * random.integer(TARGET_SIDE_METERS.min, TARGET_SIDE_METERS.max),
        FIRST_TARGET_METERS + index * TARGET_SPACING_METERS + random.integer(-TARGET_JITTER_METERS, TARGET_JITTER_METERS),
      )
      this.showSprite(this.createSprite(), kind, 'intact', position)
      this.targets.push({ position, ring: this.createRing(position, RING_COLORS.waiting, RING_RADIUS_METERS.inner, RING_RADIUS_METERS.outer), isPhotographed: false })
    }
    this.createTowers(random, towerTexture)
    this.isReady = true
  }

  /** A tower in the middle of each stretch between two targets but one, which the seed leaves out, a little off the road. */
  private createTowers(random: SeededRandom, texture: THREE.Texture): void {
    const leftOut = random.integer(0, PHOTO_TARGET_COUNT - 2)
    for (let gap = 0; gap < PHOTO_TARGET_COUNT - 1; gap += 1) {
      if (gap === leftOut) {
        continue
      }
      const position = new THREE.Vector2(random.integer(-TOWER_SPREAD_METERS, TOWER_SPREAD_METERS), FIRST_TARGET_METERS + (gap + 0.5) * TARGET_SPACING_METERS)
      this.showPicture(this.createSprite(), texture, TOWER_WIDTH_METERS, position)
      this.towers.push({ position, ring: this.createRing(position, RING_COLORS.tower, TOWER_SEEN_RADIUS_METERS - RING_THICKNESS_METERS, TOWER_SEEN_RADIUS_METERS), hasSeen: false })
    }
  }

  /** A tower sees the aircraft that flies over it, once: the detection goes up, and the ring of the tower fades. */
  private seeAircraftOverTowers(): void {
    for (const tower of this.towers) {
      if (!tower.hasSeen && tower.position.distanceTo(this.position) <= TOWER_SEEN_RADIUS_METERS) {
        tower.hasSeen = true
        ;(tower.ring.material as THREE.MeshBasicMaterial).opacity = RING_SEEN_OPACITY
        this.detection = Math.min(DETECTION_LIMIT, this.detection + DETECTION_PER_TOWER)
      }
    }
  }

  /** A ring on the ground around a target, yellow until its photo is taken, or around a tower, red. */
  private createRing(position: THREE.Vector2, color: number, innerRadius: number, outerRadius: number): THREE.Mesh {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(innerRadius, outerRadius, RING_SEGMENTS),
      new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false }),
    )
    ring.position.set(position.x, position.y, 2 * ROAD_LIFT_METERS)
    this.scene.add(ring)
    return ring
  }

  /** The first target not yet photographed whose middle is in the frame. */
  private targetInFrame(): Target | undefined {
    for (const target of this.targets) {
      const isAcross = Math.abs(target.position.x - this.position.x) < FRAME_HALF_WIDTH_METERS
      const isAlong = Math.abs(target.position.y - (this.position.y + FRAME_AHEAD_METERS)) < FRAME_HALF_LENGTH_METERS
      if (!target.isPhotographed && isAcross && isAlong) {
        return target
      }
    }
    return undefined
  }

  private photograph(target: Target): void {
    target.isPhotographed = true
    ;(target.ring.material as THREE.MeshBasicMaterial).color.set(RING_COLORS.photographed)
    this.photos += 1
    this.flashSeconds = FLASH_SECONDS
    this.lockedTarget = undefined
    this.lockSeconds = 0
  }
}
