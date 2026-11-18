import * as THREE from 'three'
import { DamageEffects } from './DamageEffects'
import {
  AIRCRAFT_ALTITUDE_METERS,
  AIRCRAFT_SCALE,
  GroundRunScene,
  PASSED_BEHIND_METERS,
  ROAD_LIFT_METERS,
  VEHICLE_KIND_NAMES,
  VEHICLE_STATES,
  VEHICLE_WIDTH_METERS,
} from './GroundRunScene'
import type { RunOutcome, VehicleKind } from './GroundRunScene'
import { SeededRandom } from './SeededRandom'

export type StrafeStatus = { destroyed: number; secondsLeft: number }

type Vehicle = {
  kind: VehicleKind
  mesh: THREE.Mesh
  position: THREE.Vector2
  fireSeconds: number
  stateIndex: number
}

const DESTROYED_INDEX = VEHICLE_STATES.length - 1
// How long each kind has to be under fire, compared with a truck.
const ARMOR: Record<VehicleKind, number> = { truck: 1, tanker: 1, 'armored-car': 1.3, 'light-tank': 1.6 }
const DAMAGED_AFTER_SECONDS = 0.5
const DESTROYED_AFTER_SECONDS = 1.1
// A tanker that blows up takes the vehicles near it one state down.
const BLAST_RADIUS_METERS = 14

const CONVOY_SPEED_METERS_PER_SECOND = 3
const FIRST_VEHICLE_METERS = 70
const VEHICLE_SPACING_METERS = 22
export const STRAFE_VEHICLE_COUNT = 6
export const STRAFE_REQUIRED_DESTROYED = 4
const LANE_OFFSET_METERS = 4
// The ground the guns cover, ahead of the aircraft, and how much of a vehicle must be in it.
const ZONE_START_METERS = 12
const ZONE_LENGTH_METERS = 24
const ZONE_HALF_WIDTH_METERS = 2.2
const VEHICLE_HALF_WIDTH_METERS = 1.2
// The muzzles of the wing guns, in the frame of the aircraft before it is scaled: out on the wings and ahead of their leading edge, where the tracers start.
const MUZZLES = [new THREE.Vector3(-1.7, 2.5, 0), new THREE.Vector3(1.7, 2.5, 0)]
const TRACER_FLICKER_SECONDS = 0.06
const TIME_LIMIT_SECONDS = 45
const ZONE_COLOR = 0xffd24a
const ZONE_OPACITY = { idle: 0.14, firing: 0.38 }

/**
 * A strafing run over a German convoy, as in Wings: it comes the other way along the road, each vehicle a sprite that goes from intact to damaged to destroyed as the guns,
 * which fire by themselves at what is in front of the aircraft, hit it. The player only steers to one side or the other.
 */
export class GroundAttackScene extends GroundRunScene<StrafeStatus> {
  private readonly zone: THREE.Mesh
  private readonly tracers: THREE.Line[] = []
  private readonly vehicles: Vehicle[] = []
  private readonly explosions: DamageEffects[] = []
  private destroyed = 0
  private tracerSeconds = 0
  private isFiring = false

  constructor(container: HTMLElement, seed: number, shadowImage: string, onStatus: (status: StrafeStatus) => void, onEnd: (outcome: RunOutcome) => void) {
    super(container, seed, shadowImage, onStatus, onEnd)
    this.zone = this.createZone()
    this.createTracers()
    void this.createConvoy(seed)
    this.start()
  }

  protected play(deltaSeconds: number): void {
    this.moveConvoy(deltaSeconds)
    this.strafe(deltaSeconds)
  }

  protected animate(deltaSeconds: number): void {
    this.showGuns(deltaSeconds)
    this.explosions.forEach((explosion) => explosion.update(deltaSeconds))
  }

  protected isOver(): boolean {
    const hasAllPassed = this.vehicles.every((vehicle) => vehicle.stateIndex === DESTROYED_INDEX || vehicle.position.y < this.position.y - PASSED_BEHIND_METERS)
    return hasAllPassed || this.secondsFlown > TIME_LIMIT_SECONDS
  }

  protected outcome(): RunOutcome {
    return this.destroyed >= STRAFE_REQUIRED_DESTROYED ? 'won' : 'escaped'
  }

  protected currentStatus(): StrafeStatus {
    return { destroyed: this.destroyed, secondsLeft: Math.max(0, TIME_LIMIT_SECONDS - this.secondsFlown) }
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
    await this.loadSprites()
    const random = new SeededRandom(seed)
    const firstLane = random.happens(50) ? 1 : -1
    for (let index = 0; index < STRAFE_VEHICLE_COUNT; index += 1) {
      const kind = random.pickOne(VEHICLE_KIND_NAMES)
      const lane = index % 2 === 0 ? firstLane : -firstLane
      const vehicle: Vehicle = {
        kind,
        mesh: this.createSprite(),
        position: new THREE.Vector2(lane * LANE_OFFSET_METERS, FIRST_VEHICLE_METERS + index * VEHICLE_SPACING_METERS),
        fireSeconds: 0,
        stateIndex: 0,
      }
      this.vehicles.push(vehicle)
      this.showVehicle(vehicle)
    }
    this.isReady = true
  }

  private showVehicle(vehicle: Vehicle): void {
    this.showSprite(vehicle.mesh, vehicle.kind, VEHICLE_STATES[vehicle.stateIndex], vehicle.position)
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
    const armor = ARMOR[vehicle.kind]
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
    explosion.object.position.set(vehicle.position.x, vehicle.position.y, 0).addScaledVector(this.screenUp, VEHICLE_WIDTH_METERS[vehicle.kind] * 0.25)
    explosion.explode()
    this.scene.add(explosion.object)
    this.explosions.push(explosion)
  }

  /** The fuel of a tanker that blows up burns the vehicles close to it: each takes a state down. */
  private blast(tanker: Vehicle): void {
    for (const vehicle of this.vehicles) {
      if (vehicle !== tanker && vehicle.stateIndex < DESTROYED_INDEX && vehicle.position.distanceTo(tanker.position) < BLAST_RADIUS_METERS) {
        const armor = ARMOR[vehicle.kind]
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
}
