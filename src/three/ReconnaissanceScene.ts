import * as THREE from 'three'
import { GroundRunScene, PASSED_BEHIND_METERS, ROAD_LIFT_METERS, VEHICLE_KIND_NAMES } from './GroundRunScene'
import type { RunOutcome } from './GroundRunScene'
import { SeededRandom } from './SeededRandom'

export type PhotoStatus = { photos: number; detection: number }

type Target = {
  position: THREE.Vector2
  ring: THREE.Mesh
  isPhotographed: boolean
}

export const PHOTO_TARGET_COUNT = 5
export const PHOTO_REQUIRED = 3
export const DETECTION_LIMIT = 100
const DETECTION_PER_SECOND = 3
const DETECTION_PER_PHOTO = 10
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
const RING_SEGMENTS = 32
const RING_COLORS = { waiting: 0xffd24a, photographed: 0x35aa46 }

/**
 * A reconnaissance over enemy ground, as in Until the Last Plane: five vehicles stand off the road, and the frame of the camera ahead of the aircraft takes a photo of
 * the one it holds for a moment. Each photo gives the aircraft away a little more, and the longer it flies, the more it is seen: when the detection is full, it is caught.
 */
export class ReconnaissanceScene extends GroundRunScene<PhotoStatus> {
  private readonly frame: THREE.Mesh
  private readonly targets: Target[] = []
  private lockedTarget: Target | undefined
  private lockSeconds = 0
  private flashSeconds = 0
  private photos = 0
  private detection = 0

  constructor(container: HTMLElement, seed: number, shadowImage: string, onStatus: (status: PhotoStatus) => void, onEnd: (outcome: RunOutcome) => void) {
    super(container, seed, shadowImage, onStatus, onEnd)
    this.frame = this.createFrame()
    void this.createTargets(seed)
    this.start()
  }

  protected play(deltaSeconds: number): void {
    this.detection = Math.min(DETECTION_LIMIT, this.detection + DETECTION_PER_SECOND * deltaSeconds)
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
      this.targets.push({ position, ring: this.createRing(position), isPhotographed: false })
    }
    this.isReady = true
  }

  /** A ring on the ground around a target, yellow until its photo is taken. */
  private createRing(position: THREE.Vector2): THREE.Mesh {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(RING_RADIUS_METERS.inner, RING_RADIUS_METERS.outer, RING_SEGMENTS),
      new THREE.MeshBasicMaterial({ color: RING_COLORS.waiting, transparent: true, depthWrite: false }),
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
    this.detection = Math.min(DETECTION_LIMIT, this.detection + DETECTION_PER_PHOTO)
    this.flashSeconds = FLASH_SECONDS
    this.lockedTarget = undefined
    this.lockSeconds = 0
  }
}
