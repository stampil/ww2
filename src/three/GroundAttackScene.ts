import * as THREE from 'three'
import { DamageEffects, SMOKING_LEVEL } from './DamageEffects'
import { DESTROYED_LEVEL } from './damageStages'
import {
  AIRCRAFT_ALTITUDE_METERS,
  AIRCRAFT_SCALE,
  GroundRunScene,
  PASSED_BEHIND_METERS,
  ROAD_LIFT_METERS,
  TARGET_WIDTH_METERS,
  VEHICLE_KIND_NAMES,
  VEHICLE_STATES,
} from './GroundRunScene'
import type { RunOutcome, TargetKind, TargetNationality } from './GroundRunScene'
import type { Livery } from './liveries'
import { SeededRandom } from './SeededRandom'

export type StrafeStatus = { destroyed: number; secondsLeft: number; isRedCrossHit: boolean }

type Vehicle = {
  kind: TargetKind
  mesh: THREE.Mesh
  position: THREE.Vector2
  fireSeconds: number
  stateIndex: number
  /** The smoke and the flames of a vehicle that is hit, which the sprites do not draw. */
  effects: DamageEffects | null
}

const DESTROYED_INDEX = VEHICLE_STATES.length - 1
// How long each kind has to be under fire, compared with a truck.
const ARMOR: Record<TargetKind, number> = { truck: 1, tanker: 1, 'armored-car': 1.3, 'light-tank': 1.6, motorcycle: 0.6, ambulance: 1, barrels: 0.8, tent: 0.8 }
// The ambulance of the Red Cross is to be spared; the fuel dump and the tent stand beside the road and do not count in the score.
const SPARED_KIND: TargetKind = 'ambulance'
const ROADSIDE_KINDS: TargetKind[] = ['barrels', 'tent']
// What burns when it is hit: it takes the vehicles near it one state down.
const EXPLOSIVE_KINDS: TargetKind[] = ['tanker', 'barrels']
const DAMAGED_AFTER_SECONDS = 0.5
const DESTROYED_AFTER_SECONDS = 1.1
const BLAST_RADIUS_METERS = 14

const CONVOY_SPEED_METERS_PER_SECOND = 3
const FIRST_VEHICLE_METERS = 70
const VEHICLE_SPACING_METERS = 22
export const STRAFE_VEHICLE_COUNT = 6
export const STRAFE_REQUIRED_DESTROYED = 4
const LANE_OFFSET_METERS = 4
const ROADSIDE_OFFSET_METERS = 8
// Where beside the road the fuel dump and the tent stand, in vehicle spacings from the first vehicle.
const BARRELS_SPACINGS = 1.5
const TENT_SPACINGS = 4.5
// The smoke and the flames are made for a truck: they are scaled by the width of the target against it.
const EFFECTS_REFERENCE_WIDTH_METERS = TARGET_WIDTH_METERS.truck
const EFFECTS_LIFT_SHARE = 0.25
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
 * A strafing run over an enemy convoy, German or French, as in Wings: it comes the other way along the road, each vehicle a sprite that goes from intact to damaged to destroyed as the guns,
 * which fire by themselves at what is in front of the aircraft, hit it. The player only steers to one side or the other.
 */
export class GroundAttackScene extends GroundRunScene<StrafeStatus> {
  private readonly zone: THREE.Mesh
  private readonly tracers: THREE.Line[] = []
  private readonly vehicles: Vehicle[] = []
  private readonly damageEffects: DamageEffects[] = []
  private destroyed = 0
  private isRedCrossHit = false
  private tracerSeconds = 0
  private isFiring = false

  constructor(
    container: HTMLElement,
    seed: number,
    shadowImage: string,
    livery: Livery,
    nationality: TargetNationality,
    windSpeed: number,
    onStatus: (status: StrafeStatus) => void,
    onEnd: (outcome: RunOutcome) => void,
  ) {
    super(container, seed, shadowImage, livery, nationality, windSpeed, onStatus, onEnd)
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
    this.damageEffects.forEach((effects) => effects.update(deltaSeconds))
  }

  protected isOver(): boolean {
    const hasAllPassed = this.vehicles.every((vehicle) => vehicle.stateIndex === DESTROYED_INDEX || vehicle.position.y < this.position.y - PASSED_BEHIND_METERS)
    return this.isRedCrossHit || hasAllPassed || this.secondsFlown > TIME_LIMIT_SECONDS
  }

  /** The attack fails when the ambulance of the Red Cross is destroyed, whatever else was. */
  protected outcome(): RunOutcome {
    return !this.isRedCrossHit && this.destroyed >= STRAFE_REQUIRED_DESTROYED ? 'won' : 'escaped'
  }

  protected currentStatus(): StrafeStatus {
    return { destroyed: this.destroyed, secondsLeft: Math.max(0, TIME_LIMIT_SECONDS - this.secondsFlown), isRedCrossHit: this.isRedCrossHit }
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
    const ambulanceIndex = random.integer(1, STRAFE_VEHICLE_COUNT)
    for (let index = 0; index <= STRAFE_VEHICLE_COUNT; index += 1) {
      const lane = index % 2 === 0 ? firstLane : -firstLane
      const kind = index === ambulanceIndex ? SPARED_KIND : random.pickOne(VEHICLE_KIND_NAMES)
      this.addVehicle(kind, lane * LANE_OFFSET_METERS, FIRST_VEHICLE_METERS + index * VEHICLE_SPACING_METERS)
    }
    this.addVehicle('barrels', -firstLane * ROADSIDE_OFFSET_METERS, FIRST_VEHICLE_METERS + BARRELS_SPACINGS * VEHICLE_SPACING_METERS)
    this.addVehicle('tent', firstLane * ROADSIDE_OFFSET_METERS, FIRST_VEHICLE_METERS + TENT_SPACINGS * VEHICLE_SPACING_METERS)
    this.isReady = true
  }

  private addVehicle(kind: TargetKind, x: number, y: number): void {
    const vehicle: Vehicle = { kind, mesh: this.createSprite(), position: new THREE.Vector2(x, y), fireSeconds: 0, stateIndex: 0, effects: null }
    this.vehicles.push(vehicle)
    this.showVehicle(vehicle)
  }

  private showVehicle(vehicle: Vehicle): void {
    this.showSprite(vehicle.mesh, vehicle.kind, VEHICLE_STATES[vehicle.stateIndex], vehicle.position)
  }

  private moveConvoy(deltaSeconds: number): void {
    for (const vehicle of this.vehicles) {
      if (vehicle.stateIndex < DESTROYED_INDEX && !ROADSIDE_KINDS.includes(vehicle.kind)) {
        vehicle.position.y -= CONVOY_SPEED_METERS_PER_SECOND * deltaSeconds
        this.showVehicle(vehicle)
        this.placeEffects(vehicle)
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
    this.showDamage(vehicle)
    if (stateIndex !== DESTROYED_INDEX) {
      return
    }
    if (vehicle.kind === SPARED_KIND) {
      this.isRedCrossHit = true
    } else if (!ROADSIDE_KINDS.includes(vehicle.kind)) {
      this.destroyed += 1
    }
    if (EXPLOSIVE_KINDS.includes(vehicle.kind)) {
      this.blast(vehicle)
    }
  }

  /** The sprites draw no smoke and no fire: a vehicle that is hit smokes, and a wreck blows up, then burns. */
  private showDamage(vehicle: Vehicle): void {
    if (vehicle.effects === null) {
      vehicle.effects = new DamageEffects()
      vehicle.effects.object.scale.setScalar(TARGET_WIDTH_METERS[vehicle.kind] / EFFECTS_REFERENCE_WIDTH_METERS)
      this.scene.add(vehicle.effects.object)
      this.damageEffects.push(vehicle.effects)
    }
    this.placeEffects(vehicle)
    if (vehicle.stateIndex === DESTROYED_INDEX) {
      vehicle.effects.explode()
      vehicle.effects.setLevel(DESTROYED_LEVEL)
    } else {
      vehicle.effects.setLevel(SMOKING_LEVEL)
    }
  }

  private placeEffects(vehicle: Vehicle): void {
    vehicle.effects?.object.position.set(vehicle.position.x, vehicle.position.y, 0).addScaledVector(this.screenUp, TARGET_WIDTH_METERS[vehicle.kind] * EFFECTS_LIFT_SHARE)
  }

  /** The fuel of a tanker or a dump that burns takes the vehicles close to it a state down. */
  private blast(source: Vehicle): void {
    for (const vehicle of this.vehicles) {
      if (vehicle !== source && vehicle.stateIndex < DESTROYED_INDEX && vehicle.position.distanceTo(source.position) < BLAST_RADIUS_METERS) {
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
