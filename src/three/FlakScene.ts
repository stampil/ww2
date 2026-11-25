import * as THREE from 'three'
import { GroundRunScene } from './GroundRunScene'
import type { RunEnd, RunOutcome, TargetNationality } from './GroundRunScene'
import type { Livery } from './liveries'
import { SeededRandom } from './SeededRandom'

export type FlakStatus = { hits: number; secondsLeft: number }

/** How many hits destroy the aircraft: the first damages it, the second destroys it. */
export const FLAK_HITS_TO_DESTROY = 2
export const FLAK_SECONDS = 20

const FUSE_SECONDS = 0.9
const BURST_SECONDS = 1.2
const BLAST_RADIUS_METERS = 4.5
// How far a shell lands from where it was aimed: the guns are wild at first and settle on an aircraft that holds its line.
const WILDEST_AIM_ERROR_METERS = 16
const STEADIEST_AIM_ERROR_METERS = 1.5
const STEADY_SECONDS_FOR_BEST_AIM = 6
const STEERING_THRESHOLD = 0.15
const SMOKE_LEVELS_FOR_FIRST_HIT = 4
const DESTROYED_LEVELS_FOR_SECOND_HIT = 4
const AIRCRAFT_SPEED_FOR_SMOKE_METERS_PER_SECOND = 40
const SKY_COLOR = 0x78aee0
const SKY_WIDTH_METERS = 500
const SKY_LENGTH_METERS = 1400
const SKY_BACK_METERS = 300
const CLOUD_COUNT = 120
const CLOUD_PUFFS = 5
const CLOUD_HALF_WIDTH_METERS = 80
const CLOUD_PUFF_RADIUS_METERS = { min: 1, max: 3 }
const CLOUD_HEIGHT_METERS = { min: 1, max: 5 }
const CLOUD_SEED_OFFSET = 1940
const CLOUD_COLOR = 0xffffff
const CLOUD_OPACITY = 0.92
const WARNING_COLOR = 0xc94e36
const WARNING_OPACITY = 0.8
const WARNING_INNER_SHARE = 0.8
const RING_SEGMENTS = 24
const WARNING_SHRINK_SHARE = 0.5
const BURST_COLOR = 0x2a2622
const BURST_START_SHARE = 0.4
const BURST_LIFT_METERS = 8
const WARNING_LIFT_METERS = 0.3
// The error of a shell along the flight is half its error across it, and is drawn in hundredths of its largest.
const ALONG_ERROR_SHARE = 0.5
const ERROR_RESOLUTION = 100

type Shell = { aim: THREE.Vector2; ageSeconds: number; warning: THREE.Mesh; burst: THREE.Mesh | null }

/**
 * The flak on the way to an enemy camp, flown from above over clouds: the guns fire shells at the aircraft, each marked by a ring on the sky where it will burst, and the player steers out of it.
 * The guns aim where the aircraft will be; they are wild at first and settle on an aircraft that holds its line. The first hit damages the aircraft, which smokes behind it, the second destroys it.
 */
export class FlakScene extends GroundRunScene<FlakStatus> {
  private readonly shells: Shell[] = []
  private readonly random: SeededRandom
  private hits = 0
  private shellCountdownSeconds = 1
  private steadySeconds = 0
  private lastSteering = 0

  constructor(
    container: HTMLElement,
    seed: number,
    shadowImage: string,
    livery: Livery,
    nationality: TargetNationality,
    windSpeed: number,
    private readonly shellsPerSecond: number,
    onStatus: (status: FlakStatus) => void,
    onEnd: (end: RunEnd) => void,
  ) {
    super(container, seed, shadowImage, livery, nationality, windSpeed, onStatus, onEnd)
    this.random = new SeededRandom(seed)
    this.player.setVelocity(new THREE.Vector3(0, AIRCRAFT_SPEED_FOR_SMOKE_METERS_PER_SECOND, 0))
    this.start()
    void this.player.ready.then(() => {
      this.isReady = true
    })
  }

  setControls(x: number): void {
    this.lastSteering = x
    super.setControls(x)
  }

  /** The sky and its clouds, laid where the aircraft will fly: there is no ground. */
  protected createBackdrop(): THREE.Object3D[] {
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(SKY_WIDTH_METERS, SKY_LENGTH_METERS), new THREE.MeshBasicMaterial({ color: SKY_COLOR }))
    sky.position.y = SKY_LENGTH_METERS / 2 - SKY_BACK_METERS
    const random = new SeededRandom(CLOUD_SEED_OFFSET)
    const puff = new THREE.IcosahedronGeometry(1, 1)
    const material = new THREE.MeshBasicMaterial({ color: CLOUD_COLOR, transparent: true, opacity: CLOUD_OPACITY })
    const clouds = new THREE.Group()
    for (let index = 0; index < CLOUD_COUNT; index += 1) {
      const cloud = new THREE.Group()
      for (let place = 0; place < CLOUD_PUFFS; place += 1) {
        const mesh = new THREE.Mesh(puff, material)
        mesh.scale.setScalar(random.integer(CLOUD_PUFF_RADIUS_METERS.min, CLOUD_PUFF_RADIUS_METERS.max))
        mesh.position.set(random.integer(-CLOUD_PUFF_RADIUS_METERS.max, CLOUD_PUFF_RADIUS_METERS.max), random.integer(-CLOUD_PUFF_RADIUS_METERS.max, CLOUD_PUFF_RADIUS_METERS.max), 0)
        cloud.add(mesh)
      }
      cloud.position.set(random.integer(-CLOUD_HALF_WIDTH_METERS, CLOUD_HALF_WIDTH_METERS), random.integer(-SKY_BACK_METERS, SKY_LENGTH_METERS - SKY_BACK_METERS), random.integer(CLOUD_HEIGHT_METERS.min, CLOUD_HEIGHT_METERS.max))
      clouds.add(cloud)
    }

    return [sky, clouds]
  }

  protected play(deltaSeconds: number): void {
    this.steadySeconds = Math.abs(this.lastSteering) > STEERING_THRESHOLD ? 0 : this.steadySeconds + deltaSeconds
    this.shellCountdownSeconds -= deltaSeconds
    if (this.shellCountdownSeconds <= 0) {
      this.fire()
      this.shellCountdownSeconds += 1 / this.shellsPerSecond
    }
    for (const shell of [...this.shells]) {
      shell.ageSeconds += deltaSeconds
      if (shell.burst === null && shell.ageSeconds >= FUSE_SECONDS) {
        this.burst(shell)
      }
    }
  }

  protected animate(): void {
    for (const shell of [...this.shells]) {
      if (shell.burst === null) {
        shell.warning.scale.setScalar(1 - WARNING_SHRINK_SHARE * (shell.ageSeconds / FUSE_SECONDS))
        continue
      }
      const burstAge = shell.ageSeconds - FUSE_SECONDS
      if (burstAge >= BURST_SECONDS) {
        this.scene.remove(shell.warning, shell.burst)
        this.shells.splice(this.shells.indexOf(shell), 1)
        continue
      }
      const material = shell.burst.material as THREE.MeshBasicMaterial
      material.opacity = 1 - burstAge / BURST_SECONDS
      shell.burst.scale.setScalar(BLAST_RADIUS_METERS * (BURST_START_SHARE + burstAge))
    }
  }

  protected isOver(): boolean {
    return this.hits >= FLAK_HITS_TO_DESTROY || this.secondsFlown >= FLAK_SECONDS
  }

  protected outcome(): RunOutcome {
    return this.hits < FLAK_HITS_TO_DESTROY ? 'won' : 'escaped'
  }

  protected hitsTaken(): number {
    return this.hits
  }

  protected currentStatus(): FlakStatus {
    return { hits: this.hits, secondsLeft: Math.max(0, FLAK_SECONDS - this.secondsFlown) }
  }

  /** A shell aimed at where the aircraft will be when it bursts, off by how wild the guns still are: its ring shows on the sky. */
  private fire(): void {
    const steadiness = Math.min(1, this.steadySeconds / STEADY_SECONDS_FOR_BEST_AIM)
    const errorMeters = WILDEST_AIM_ERROR_METERS - (WILDEST_AIM_ERROR_METERS - STEADIEST_AIM_ERROR_METERS) * steadiness
    const spread = (): number => this.random.integer(-ERROR_RESOLUTION, ERROR_RESOLUTION) / ERROR_RESOLUTION
    const aim = new THREE.Vector2(
      this.position.x + this.lastSteering * this.lateralSpeedMetersPerSecond * FUSE_SECONDS + spread() * errorMeters,
      this.position.y + this.forwardSpeedMetersPerSecond * FUSE_SECONDS + spread() * errorMeters * ALONG_ERROR_SHARE,
    )
    const warning = new THREE.Mesh(new THREE.RingGeometry(BLAST_RADIUS_METERS * WARNING_INNER_SHARE, BLAST_RADIUS_METERS, RING_SEGMENTS), new THREE.MeshBasicMaterial({ color: WARNING_COLOR, transparent: true, opacity: WARNING_OPACITY }))
    warning.position.set(aim.x, aim.y, WARNING_LIFT_METERS)
    this.scene.add(warning)
    this.shells.push({ aim, ageSeconds: 0, warning, burst: null })
  }

  /** The shell bursts: a black puff with an orange heart, which hits the aircraft if it is inside the blast. */
  private burst(shell: Shell): void {
    const material = new THREE.MeshBasicMaterial({ color: BURST_COLOR, transparent: true, opacity: 1 })
    const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), material)
    puff.position.set(shell.aim.x, shell.aim.y, BURST_LIFT_METERS)
    puff.scale.setScalar(BLAST_RADIUS_METERS * BURST_START_SHARE)
    this.scene.add(puff)
    shell.burst = puff
    shell.warning.visible = false
    if (this.position.distanceTo(shell.aim) <= BLAST_RADIUS_METERS && this.hits < FLAK_HITS_TO_DESTROY) {
      this.hits += 1
      const levels = this.hits === 1 ? SMOKE_LEVELS_FOR_FIRST_HIT : DESTROYED_LEVELS_FOR_SECOND_HIT
      for (let level = 0; level < levels; level += 1) {
        this.player.inflictDamage()
      }
    }
  }
}
