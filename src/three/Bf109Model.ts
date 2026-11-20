import * as THREE from 'three'
import { buildGeometry, buildMaterials, loadModelData } from './ac3d'
import type { AircraftModel3D } from './aircraftModel'
import type { AircraftState } from './aircraftState'
import { DamageEffects } from './DamageEffects'
import type { DamageSpots } from './DamageEffects'
import type { AircraftControl } from './D520Model'
import { DESTROYED_LEVEL } from './damageStages'
import { Debris } from './Debris'
import { directionFromFlightGear, pointFromFlightGear } from './flightGearFrame'
import { createHinge, turnHinge } from './hinge'
import type { Hinge } from './hinge'
import { EasedValue } from './motion'

const MODEL_FOLDER = 'bf109'
const MODEL_NAME = 'bf109'
// How far tools/convert-ac3d.py lowered the model, which the manifest gives as the origin of each of its parts.
const LOWERING_METERS = 0.5136
const DEGREES = Math.PI / 180
const GEAR_TRAVEL_SECONDS = 2
const FLAP_TRAVEL_SECONDS = 2
const ENGINE_SPOOL_SECONDS = 2
// The parts that the aircraft shows only in some of its variants: the tropical air filter and the second kind of cowling bulge.
const HIDDEN_PARTS = ['tropfilter2', 'K-beule']
const GLASS_PARTS = ['canopyglass_G10', 'frontglass']
const HUB_PART = 'prophub'
// The pivots, axes and angles below are the ones of the animations in FlightGear's Bf-109g.xml, turned into our frame.
const ELEVATOR_PARTS = ['elevator.L', 'elevator.R']
const ELEVATOR_PIVOT = pointFromFlightGear(3.6, 0, 0.76, LOWERING_METERS)
const ELEVATOR_AXIS = directionFromFlightGear(0, 1, 0)
const ELEVATOR_DOWN_RADIANS = 20 * DEGREES
const ELEVATOR_UP_RADIANS = 30 * DEGREES
const RUDDER_PART = 'rudder_w'
const RUDDER_PIVOT = pointFromFlightGear(3.66, 0, 0, LOWERING_METERS)
const RUDDER_AXIS = directionFromFlightGear(0, 0, 1)
const RUDDER_RADIANS = 30 * DEGREES
// The propeller has no blades in the model: a faint disc stands for it when the engine runs.
const PROPELLER_DISC_RADIUS_METERS = 1.5
const PROPELLER_DISC_CENTER = new THREE.Vector3(0, 4.35, -0.4736)
const PROPELLER_DISC_OPACITY = 0.25
const PROPELLER_DISC_COLOR = 0x2a2a2a
const PROPELLER_DISC_SEGMENTS = 48

/** The wingspan of the model, measured on it. */
const SPAN_METERS = 9.798
// Where the wheels touch the ground once the gear is down, measured on the model: y ahead of the middle of the model, z its height.
const MAIN_WHEEL_CONTACT = { y: 2.643, z: -2.152 }
const TAIL_WHEEL_CONTACT = { y: -3.319, z: -0.808 }

type Point = [number, number, number]
/** Parts that turn around the axis through two points, by this many degrees when the control is at its full travel. */
type HingeSpec = { parts: string[]; from: Point; to: Point; degrees: number }

// The model is drawn with the gear up: the angle brings it down.
const GEAR: HingeSpec[] = [
  { parts: ['gear1.L', 'wheel1.L', 'wheel2.L', 'geardoor2.L'], from: [-2.2, -0.315, -0.325], to: [-2.1, -0.289, -0.375], degrees: 71 },
  { parts: ['gear1.R', 'wheel1.R', 'wheel2.R', 'geardoor2.R'], from: [-2.2, 0.315, -0.325], to: [-2.1, 0.289, -0.375], degrees: -71 },
  { parts: ['geardoor1.L'], from: [-2.2, -0.315, -0.375], to: [-2.1, -0.289, -0.425], degrees: 76 },
  { parts: ['geardoor1.R'], from: [-2.2, 0.315, -0.375], to: [-2.1, 0.289, -0.425], degrees: -76 },
]
// The landing flaps, with the flaps of the radiators that open with them.
const FLAPS: HingeSpec[] = [
  { parts: ['flap.L'], from: [-1.146, -2.73, -0.196], to: [-0.887, -1.409, -0.34], degrees: 47 },
  { parts: ['flap.R'], from: [-1.146, 2.73, -0.196], to: [-0.887, 1.409, -0.34], degrees: -47 },
  { parts: ['coolflap.L'], from: [-0.973, -1.411, -0.399], to: [-0.902, -0.624, -0.466], degrees: 57 },
  { parts: ['coolflap.R'], from: [-0.973, 1.411, -0.399], to: [-0.902, 0.624, -0.466], degrees: -57 },
  { parts: ['upcoolflap.L'], from: [-0.85, -0.591, -0.329], to: [-0.974, -1.399, -0.252], degrees: -57 },
  { parts: ['upcoolflap.R'], from: [-0.85, 0.591, -0.329], to: [-0.974, 1.399, -0.252], degrees: 57 },
]
const AILERONS: HingeSpec[] = [
  { parts: ['aileron.L'], from: [-1.34, -4.23, -0.03], to: [-1.16, -2.73, -0.15], degrees: 15 },
  { parts: ['aileron.R'], from: [-1.34, 4.23, -0.03], to: [-1.16, 2.73, -0.15], degrees: 15 },
]
// Where the smoke and the flames come from: a wing root, the cowling of the engine, the middle of the fuselage.
const DAMAGE_SPOTS: DamageSpots = {
  wingRoot: new THREE.Vector3(-0.9, 0.4, -0.75),
  engine: new THREE.Vector3(0, 3.1, 0),
  fuselage: new THREE.Vector3(0, -0.6, -0.3),
}

type TurningHinge = { hinge: Hinge; degrees: number }

/** The nose-up angle at rest, where the main wheels and the tail wheel both touch the ground. */
const GROUND_PITCH_RADIANS = Math.atan2(TAIL_WHEEL_CONTACT.z - MAIN_WHEEL_CONTACT.z, MAIN_WHEEL_CONTACT.y - TAIL_WHEEL_CONTACT.y)

/**
 * The Bf 109 G-14 of the FlightGear model by Detlef Faber and Marco Schüle (GPL v2), loaded from the files made by tools/convert-ac3d.py.
 * Nose along +y, right wing along +x, up along +z, in meters, shown once loaded. The gear, the flaps, the ailerons, the elevator and the rudder move as the animations of its Bf-109g.xml say.
 */
export class Bf109Model implements AircraftModel3D {
  readonly object = new THREE.Group()
  readonly spanMeters = SPAN_METERS
  readonly groundPitchRadians = GROUND_PITCH_RADIANS
  private readonly effects = new DamageEffects(DAMAGE_SPOTS)
  private readonly debris = new Debris()
  private readonly parts = new Map<string, THREE.Mesh>()
  private readonly gear: TurningHinge[] = []
  private readonly flaps: TurningHinge[] = []
  private readonly ailerons: TurningHinge[] = []
  private readonly elevator: Hinge[] = []
  private rudder: Hinge | undefined
  private readonly eased = {
    retractGear: new EasedValue(GEAR_TRAVEL_SECONDS),
    lowerFlaps: new EasedValue(FLAP_TRAVEL_SECONDS),
    runEngine: new EasedValue(ENGINE_SPOOL_SECONDS),
  }
  private readonly propellerDisc = this.createPropellerDisc()
  private texturedMaterials: THREE.MeshStandardMaterial[] = []
  private liveryTexture: THREE.Texture | undefined
  private deflection = { aileron: 0, rudder: 0, elevator: 0 }
  private damageLevel = 0
  private isGlassHidden = false
  /** Settles once the parts are loaded and in place. */
  readonly ready: Promise<void>

  constructor() {
    this.object.add(this.effects.object, this.propellerDisc)
    this.ready = this.load()
  }

  axisHeightOnGround(pitchRadians: number): number {
    return -(MAIN_WHEEL_CONTACT.z * Math.cos(pitchRadians) + MAIN_WHEEL_CONTACT.y * Math.sin(pitchRadians))
  }

  setTailNumber(): void {
    // The fin of the Bf 109 carries no number.
  }

  setLivery(texture: THREE.Texture): void {
    this.liveryTexture = texture
    this.applyTexture()
  }

  setVelocity(velocity: THREE.Vector3): void {
    this.effects.setVelocity(velocity)
  }

  inflictDamage(): number {
    if (this.damageLevel >= DESTROYED_LEVEL) {
      return this.damageLevel
    }
    this.damageLevel += 1
    this.effects.setLevel(this.damageLevel)
    if (this.damageLevel === DESTROYED_LEVEL) {
      this.destroy()
    }
    return this.damageLevel
  }

  repair(): void {
    this.damageLevel = 0
    this.effects.reset()
    this.debris.putBack()
  }

  hideGunsight(): void {
    // The model has no cockpit, so no gunsight.
  }

  hideRearCanopy(): void {
    // The model has no cockpit, so no rear canopy to hide.
  }

  hideGlass(): void {
    this.isGlassHidden = true
    this.applyGlassVisibility()
  }

  /** Starts or stops one animation: it eases in and out; the other animations of the D.520 have no counterpart here. */
  setControl(control: AircraftControl, isActive: boolean): void {
    if (control === 'retractGear' || control === 'lowerFlaps' || control === 'runEngine') {
      this.eased[control].setTarget(isActive ? 1 : 0)
    }
  }

  setState(state: AircraftState): void {
    this.eased.runEngine.snap(state.engine)
    this.eased.retractGear.snap(state.gearRetraction)
    this.eased.lowerFlaps.snap(state.flaps)
    this.deflection = { aileron: state.aileron, rudder: state.rudder, elevator: state.elevator }
  }

  update(deltaSeconds: number): void {
    this.effects.update(deltaSeconds)
    if (this.debris.isFlying) {
      this.debris.update(deltaSeconds)
      return
    }
    Object.values(this.eased).forEach((value) => value.update(deltaSeconds))
    this.propellerDisc.material.opacity = PROPELLER_DISC_OPACITY * this.eased.runEngine.position
    const gearDown = 1 - this.eased.retractGear.position
    for (const turning of this.gear) {
      turnHinge(turning.hinge, turning.degrees * DEGREES * gearDown)
    }
    for (const turning of this.flaps) {
      turnHinge(turning.hinge, turning.degrees * DEGREES * this.eased.lowerFlaps.position)
    }
    for (const turning of this.ailerons) {
      turnHinge(turning.hinge, turning.degrees * DEGREES * this.deflection.aileron)
    }
    const elevatorRadians = this.deflection.elevator >= 0 ? ELEVATOR_DOWN_RADIANS : ELEVATOR_UP_RADIANS
    this.elevator.forEach((hinge) => turnHinge(hinge, elevatorRadians * this.deflection.elevator))
    if (this.rudder !== undefined) {
      turnHinge(this.rudder, RUDDER_RADIANS * this.deflection.rudder)
    }
  }

  /** The explosion: the control surfaces, the gear and the propeller hub are torn off. */
  private destroy(): void {
    this.effects.explode()
    const pieces: THREE.Object3D[] = []
    for (const turning of [...this.gear, ...this.flaps, ...this.ailerons]) {
      pieces.push(turning.hinge.group)
    }
    this.elevator.forEach((hinge) => pieces.push(hinge.group))
    if (this.rudder !== undefined) {
      pieces.push(this.rudder.group)
    }
    const hub = this.parts.get(HUB_PART)
    if (hub !== undefined) {
      pieces.push(hub)
    }
    this.debris.tearOff(pieces)
    this.propellerDisc.material.opacity = 0
  }

  private createPropellerDisc(): THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial> {
    const geometry = new THREE.CircleGeometry(PROPELLER_DISC_RADIUS_METERS, PROPELLER_DISC_SEGMENTS)
    geometry.rotateX(-Math.PI / 2)
    const material = new THREE.MeshBasicMaterial({ color: PROPELLER_DISC_COLOR, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
    const disc = new THREE.Mesh(geometry, material)
    disc.position.copy(PROPELLER_DISC_CENTER)
    return disc
  }

  private applyTexture(): void {
    this.texturedMaterials.forEach((material) => {
      material.map = this.liveryTexture ?? null
      material.needsUpdate = true
    })
  }

  private applyGlassVisibility(): void {
    GLASS_PARTS.forEach((name) => {
      const mesh = this.parts.get(name)
      if (mesh !== undefined) {
        mesh.visible = !this.isGlassHidden
      }
    })
  }

  private async load(): Promise<void> {
    const { manifest, buffer } = await loadModelData(MODEL_FOLDER, MODEL_NAME)
    const materials = buildMaterials(manifest)
    this.texturedMaterials = materials.filter((_, index) => manifest.materials[index].texture !== null)
    for (const entry of manifest.parts) {
      const mesh = new THREE.Mesh(buildGeometry(entry, buffer, true), materials)
      mesh.visible = !HIDDEN_PARTS.includes(entry.name)
      this.parts.set(entry.name, mesh)
      this.object.add(mesh)
    }
    this.buildRig()
    this.applyTexture()
    this.applyGlassVisibility()
  }

  /** Puts the moving parts in hinges, so that turning a hinge turns its parts around the axis of Bf-109g.xml. */
  private buildRig(): void {
    for (const spec of GEAR) {
      this.gear.push(this.turningHinge(spec))
    }
    for (const spec of FLAPS) {
      this.flaps.push(this.turningHinge(spec))
    }
    for (const spec of AILERONS) {
      this.ailerons.push(this.turningHinge(spec))
    }
    ELEVATOR_PARTS.forEach((name) => this.elevator.push(createHinge(this.object, [this.part(name)], ELEVATOR_PIVOT, ELEVATOR_AXIS)))
    this.rudder = createHinge(this.object, [this.part(RUDDER_PART)], RUDDER_PIVOT, RUDDER_AXIS)
  }

  private turningHinge(spec: HingeSpec): TurningHinge {
    const [fromX, fromY, fromZ] = spec.from
    const [toX, toY, toZ] = spec.to
    const axis = directionFromFlightGear(toX - fromX, toY - fromY, toZ - fromZ)
    const hinge = createHinge(
      this.object,
      spec.parts.map((name) => this.part(name)),
      pointFromFlightGear(fromX, fromY, fromZ, LOWERING_METERS),
      axis,
    )
    return { hinge, degrees: spec.degrees }
  }

  private part(name: string): THREE.Mesh {
    return this.parts.get(name)!
  }
}
