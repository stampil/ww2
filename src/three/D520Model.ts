import * as THREE from 'three'
import { buildGeometry, buildMaterials, loadModelData } from './ac3d'
import type { AircraftState } from './aircraftState'
import { CockpitModel } from './CockpitModel'
import { DamageEffects } from './DamageEffects'
import { DamagePainter } from './DamagePainter'
import { DESTROYED_LEVEL } from './damageStages'
import { Debris } from './Debris'
import { directionFromFlightGear, pointFromFlightGear } from './flightGearFrame'
import { EasedValue } from './motion'

const MODEL_NAME = 'd520'
const BLADES_PART = 'helice'
const SPINNER_PART = 'bol'
const BLUR_PART = 'propblur'
const CANOPY_PARTS = ['canopy', 'tourcanopy']
const DEGREES = Math.PI / 180
const FULL_TURN_RADIANS = 2 * Math.PI
const MAX_PROPELLER_TURNS_PER_SECOND = 10
const BLADES_FADED_OPACITY = 0.25
const WHEEL_TURNS_PER_SECOND = 3
const GEAR_WHEEL_RADIANS = 85 * DEGREES
const GEAR_DOOR_RADIANS = 90 * DEGREES
const FLAP_RADIANS = 40 * DEGREES
const AILERON_RADIANS = 15 * DEGREES
const ELEVATOR_RADIANS = 15 * DEGREES
const RUDDER_RADIANS = -15 * DEGREES
const SWEEP_SECONDS = 3
const ENGINE_SPOOL_SECONDS = 2
const WHEEL_SPIN_UP_SECONDS = 1
const GEAR_TRAVEL_SECONDS = 2
const FLAP_TRAVEL_SECONDS = 2
const SWEEP_FADE_SECONDS = 0.5

export type AircraftControl =
  | 'retractGear'
  | 'spinWheels'
  | 'openCanopy'
  | 'runEngine'
  | 'lowerFlaps'
  | 'moveAilerons'
  | 'moveRudder'
  | 'moveElevator'
export const AIRCRAFT_CONTROLS: AircraftControl[] = [
  'retractGear',
  'spinWheels',
  'openCanopy',
  'runEngine',
  'lowerFlaps',
  'moveAilerons',
  'moveRudder',
  'moveElevator',
]
type ExteriorControl = Exclude<AircraftControl, 'openCanopy'>

/** The distance from the thrust axis down to the wheels, so the aircraft can stand on the ground. */
export const D520_LOWEST_POINT_METERS = 2.08

type Hinge = { group: THREE.Group; axis: THREE.Vector3 }
type GearSideHinges = { wheel: Hinge; door: Hinge; doorMesh: THREE.Mesh; doorRest: THREE.Vector3; direction: 1 | -1 }
type SurfaceName = 'elevator' | 'rudder' | 'aileronLeft' | 'aileronRight' | 'flapLeft' | 'flapRight'
type SurfaceSpec = { part: string; pivot: THREE.Vector3; axis: THREE.Vector3 }
type Point = [number, number, number]

// The pivots, axes and angles below are the ones of the animations in FlightGear's d520.xml, turned into our frame.
function surfaceThrough(part: string, from: Point, to: Point): SurfaceSpec {
  const axis: Point = [to[0] - from[0], to[1] - from[1], to[2] - from[2]]
  return { part, pivot: pointFromFlightGear(...from), axis: directionFromFlightGear(...axis) }
}

const SURFACES: Record<SurfaceName, SurfaceSpec> = {
  elevator: { part: 'profondeur', pivot: pointFromFlightGear(3.3838, 0, 0.6178), axis: directionFromFlightGear(0, 1, 0) },
  rudder: { part: 'direction', pivot: pointFromFlightGear(3.65748, 0, 0.59525), axis: directionFromFlightGear(0, 0, 1) },
  aileronLeft: surfaceThrough('aileronG', [-0.971, -4.633, -0.147], [-0.856, -3.026, -0.228]),
  aileronRight: surfaceThrough('aileronD', [-0.856, 3.026, -0.228], [-0.971, 4.633, -0.147]),
  flapLeft: surfaceThrough('voletG', [-0.798, -3.027, -0.268], [-0.617, -0.662, -0.418]),
  flapRight: surfaceThrough('voletD', [-0.617, 0.662, -0.418], [-0.798, 3.027, -0.268]),
}

const GEAR_AXIS = directionFromFlightGear(1, 0, 0)
const GEAR_DOOR_SLIDE = directionFromFlightGear(0, 0, -0.2)
const TAIL_WHEEL_PART = 'roueA'
const TAIL_WHEEL_PIVOT = pointFromFlightGear(3.362, 0, -0.331)
const TAIL_WHEEL_AXIS = directionFromFlightGear(0, -1, 0)
const GEAR_SIDES = [
  {
    wheelPart: 'roueG',
    strutPart: 'axeG',
    doorPart: 'porteG',
    direction: 1 as const,
    wheelPivot: pointFromFlightGear(-1.665, -1.442, -0.373),
    doorPivot: pointFromFlightGear(-1.663, -1.508, -0.431),
    axlePivot: pointFromFlightGear(-1.983, -1.379, -1.42),
    axleAxis: directionFromFlightGear(0.001, -0.149, 0.011),
  },
  {
    wheelPart: 'roueD',
    strutPart: 'axeD',
    doorPart: 'porteD',
    direction: -1 as const,
    wheelPivot: pointFromFlightGear(-1.665, 1.442, -0.373),
    doorPivot: pointFromFlightGear(-1.663, 1.508, -0.431),
    axlePivot: pointFromFlightGear(-1.984, 1.23, -1.431),
    axleAxis: directionFromFlightGear(-0.001, -0.149, -0.011),
  },
]

/**
 * The D.520 of the FlightGear model by Emmanuel Baranger (GPL v2), loaded from the files made by tools/convert-ac3d.py.
 * Nose along +y, right wing along +x, up along +z, origin on the thrust axis, in meters. Shown once loaded.
 */
export class D520Model {
  readonly object = new THREE.Group()
  private readonly cockpit = new CockpitModel()
  private readonly effects = new DamageEffects()
  private readonly debris = new Debris()
  private readonly parts = new Map<string, THREE.Mesh>()
  private readonly surfaceHinges = new Map<SurfaceName, Hinge>()
  private readonly gearSides: GearSideHinges[] = []
  private readonly wheelHinges: Hinge[] = []
  private readonly eased: Record<ExteriorControl, EasedValue> = {
    retractGear: new EasedValue(GEAR_TRAVEL_SECONDS),
    spinWheels: new EasedValue(WHEEL_SPIN_UP_SECONDS),
    runEngine: new EasedValue(ENGINE_SPOOL_SECONDS),
    lowerFlaps: new EasedValue(FLAP_TRAVEL_SECONDS),
    moveAilerons: new EasedValue(SWEEP_FADE_SECONDS),
    moveRudder: new EasedValue(SWEEP_FADE_SECONDS),
    moveElevator: new EasedValue(SWEEP_FADE_SECONDS),
  }
  private materials: THREE.MeshStandardMaterial[] = []
  private bladesMaterial: THREE.MeshStandardMaterial | undefined
  private blurMaterial: THREE.MeshStandardMaterial | undefined
  private blurOpacity = 0
  private texture: THREE.Texture | undefined
  private liveryTexture: THREE.Texture | undefined
  private damagePainter: DamagePainter | undefined
  private damageTexture: THREE.CanvasTexture | undefined
  private damageLevel = 0
  private wheelAngle = 0
  private deflection = { aileron: 0, rudder: 0, elevator: 0 }
  private sweepPhase = 0
  /** Settles once the parts are loaded and in place. */
  readonly ready: Promise<void>

  constructor() {
    this.object.add(this.cockpit.object)
    this.object.add(this.effects.object)
    this.ready = this.load()
  }

  setLivery(texture: THREE.Texture): void {
    this.liveryTexture = texture
    this.damagePainter?.useImage(texture.image as HTMLImageElement)
    this.showTexture()
  }

  /** The velocity of the aircraft in its own frame, in meters per second: the smoke trails against it. */
  setVelocity(velocity: THREE.Vector3): void {
    this.effects.setVelocity(velocity)
  }

  /** One more level of damage, up to destruction; returns the level reached. */
  inflictDamage(): number {
    if (this.damageLevel >= DESTROYED_LEVEL) {
      return this.damageLevel
    }
    this.damageLevel += 1
    this.showTexture()
    this.effects.setLevel(this.damageLevel)
    if (this.damageLevel === DESTROYED_LEVEL) {
      this.destroy()
    }
    return this.damageLevel
  }

  /** Puts the aircraft back in one piece, without damage. */
  repair(): void {
    this.damageLevel = 0
    this.damagePainter = undefined
    this.effects.reset()
    this.debris.putBack()
    this.showTexture()
  }

  /** Starts or stops one animation: it eases in and out; the canopy is the cockpit's, and the gauges follow the engine. */
  setControl(control: AircraftControl, isActive: boolean): void {
    if (control === 'openCanopy') {
      this.cockpit.setControl(control, isActive)
    } else {
      this.eased[control].setTarget(isActive ? 1 : 0)
    }
    if (control === 'runEngine') {
      this.cockpit.setControl('runGauges', isActive)
    }
  }

  /** Puts every moving part where the state says, at once, for a flight that drives them (the buttons ease them instead). */
  setState(state: AircraftState): void {
    this.eased.runEngine.snap(state.engine)
    this.eased.retractGear.snap(state.gearRetraction)
    this.eased.lowerFlaps.snap(state.flaps)
    this.eased.spinWheels.snap(state.wheels)
    this.deflection = { aileron: state.aileron, rudder: state.rudder, elevator: state.elevator }
  }

  update(deltaSeconds: number): void {
    this.cockpit.update(deltaSeconds)
    CANOPY_PARTS.forEach((name) => this.parts.get(name)?.position.copy(this.cockpit.canopyTranslation))
    this.effects.update(deltaSeconds)
    if (this.debris.isFlying) {
      this.debris.update(deltaSeconds)
      return
    }
    Object.values(this.eased).forEach((value) => value.update(deltaSeconds))
    this.sweepPhase += (FULL_TURN_RADIANS * deltaSeconds) / SWEEP_SECONDS
    this.turnPropeller(deltaSeconds)
    this.turnWheels(deltaSeconds)
    this.moveGear()
    this.moveSurfaces()
  }

  private turnPropeller(deltaSeconds: number): void {
    const blades = this.parts.get(BLADES_PART)
    if (blades === undefined || this.bladesMaterial === undefined || this.blurMaterial === undefined) {
      return
    }
    const share = this.eased.runEngine.position
    blades.rotation.y += share * MAX_PROPELLER_TURNS_PER_SECOND * FULL_TURN_RADIANS * deltaSeconds
    this.bladesMaterial.opacity = 1 - share * (1 - BLADES_FADED_OPACITY)
    this.blurMaterial.opacity = this.blurOpacity * share
  }

  private turnWheels(deltaSeconds: number): void {
    this.wheelAngle += this.eased.spinWheels.position * WHEEL_TURNS_PER_SECOND * FULL_TURN_RADIANS * deltaSeconds
    this.wheelHinges.forEach((hinge) => this.turn(hinge, this.wheelAngle))
  }

  private moveGear(): void {
    const retraction = this.eased.retractGear.position
    for (const side of this.gearSides) {
      this.turn(side.wheel, side.direction * GEAR_WHEEL_RADIANS * retraction)
      this.turn(side.door, side.direction * GEAR_DOOR_RADIANS * retraction)
      side.doorMesh.position.copy(side.doorRest).addScaledVector(GEAR_DOOR_SLIDE, retraction)
    }
  }

  private moveSurfaces(): void {
    const sweep = Math.sin(this.sweepPhase)
    const aileron = AILERON_RADIANS * (this.deflection.aileron + sweep * this.eased.moveAilerons.position)
    const flaps = FLAP_RADIANS * this.eased.lowerFlaps.position
    this.turnSurface('elevator', ELEVATOR_RADIANS * (this.deflection.elevator + sweep * this.eased.moveElevator.position))
    this.turnSurface('rudder', RUDDER_RADIANS * (this.deflection.rudder + sweep * this.eased.moveRudder.position))
    this.turnSurface('aileronLeft', aileron)
    this.turnSurface('aileronRight', -aileron)
    this.turnSurface('flapLeft', flaps)
    this.turnSurface('flapRight', flaps)
  }

  private turnSurface(name: SurfaceName, radians: number): void {
    const hinge = this.surfaceHinges.get(name)
    if (hinge !== undefined) {
      this.turn(hinge, radians)
    }
  }

  private turn(hinge: Hinge, radians: number): void {
    hinge.group.quaternion.setFromAxisAngle(hinge.axis, radians)
  }

  /** The livery, with the marks of the damage painted on it when the aircraft is damaged. */
  private showTexture(): void {
    if (this.liveryTexture === undefined) {
      return
    }
    if (this.damageLevel === 0) {
      this.texture = this.liveryTexture
    } else {
      this.damagePainter ??= new DamagePainter(this.liveryTexture.image as HTMLImageElement)
      this.damagePainter.setLevel(this.damageLevel)
      const canvas = this.damagePainter.canvas
      if (this.damageTexture === undefined || this.damageTexture.image !== canvas || this.damageTexture.userData.pixels !== canvas.width) {
        this.damageTexture?.dispose()
        this.damageTexture = new THREE.CanvasTexture(canvas)
        this.damageTexture.userData.pixels = canvas.width
        this.damageTexture.colorSpace = THREE.SRGBColorSpace
        this.damageTexture.anisotropy = this.liveryTexture.anisotropy
      }
      this.damageTexture.needsUpdate = true
      this.texture = this.damageTexture
    }
    this.applyTexture()
  }

  /** The explosion: the control surfaces, the wheels and the propeller are torn off. */
  private destroy(): void {
    this.effects.explode()
    const pieces: THREE.Object3D[] = []
    this.surfaceHinges.forEach((hinge) => pieces.push(hinge.group))
    for (const side of this.gearSides) {
      pieces.push(side.wheel.group)
    }
    for (const name of [BLADES_PART, SPINNER_PART]) {
      const part = this.parts.get(name)
      if (part !== undefined) {
        pieces.push(part)
      }
    }
    this.debris.tearOff(pieces)
    if (this.blurMaterial !== undefined) {
      this.blurMaterial.opacity = 0
    }
  }

  private applyTexture(): void {
    const materials = this.bladesMaterial === undefined ? this.materials : [...this.materials, this.bladesMaterial]
    materials.forEach((material) => {
      material.map = this.texture ?? null
      material.needsUpdate = true
    })
  }

  private async load(): Promise<void> {
    const { manifest, buffer } = await loadModelData(MODEL_NAME)
    this.materials = buildMaterials(manifest)
    this.bladesMaterial = this.materials[0].clone()
    this.bladesMaterial.transparent = true
    const blurMaterialIndex = manifest.parts.find((part) => part.name === BLUR_PART)!.groups[0].material
    this.blurMaterial = this.materials[blurMaterialIndex]
    this.blurOpacity = manifest.materials[blurMaterialIndex].opacity
    this.blurMaterial.opacity = 0

    for (const entry of manifest.parts) {
      const isBlades = entry.name === BLADES_PART
      const mesh = new THREE.Mesh(buildGeometry(entry, buffer, !isBlades), isBlades ? this.bladesMaterial : this.materials)
      this.parts.set(entry.name, mesh)
      this.object.add(mesh)
    }
    this.buildRig()
    this.applyTexture()
  }

  /** Puts the moving parts in hinges, so that turning a hinge turns its parts around the axis of d520.xml. */
  private buildRig(): void {
    for (const name of Object.keys(SURFACES) as SurfaceName[]) {
      const surface = SURFACES[name]
      this.surfaceHinges.set(name, this.hinge([this.part(surface.part)], surface.pivot, surface.axis))
    }
    for (const side of GEAR_SIDES) {
      const wheelSpin = this.hinge([this.part(side.wheelPart)], side.axlePivot, side.axleAxis)
      this.wheelHinges.push(wheelSpin)
      const doorMesh = this.part(side.doorPart)
      const door = this.hinge([doorMesh], side.doorPivot, GEAR_AXIS)
      const wheel = this.hinge([this.part(side.strutPart), wheelSpin.group], side.wheelPivot, GEAR_AXIS)
      this.gearSides.push({ wheel, door, doorMesh, doorRest: doorMesh.position.clone(), direction: side.direction })
    }
    this.wheelHinges.push(this.hinge([this.part(TAIL_WHEEL_PART)], TAIL_WHEEL_PIVOT, TAIL_WHEEL_AXIS))
  }

  private part(name: string): THREE.Mesh {
    return this.parts.get(name)!
  }

  private hinge(children: THREE.Object3D[], pivot: THREE.Vector3, axis: THREE.Vector3): Hinge {
    const group = new THREE.Group()
    group.position.copy(pivot)
    children.forEach((child) => {
      child.removeFromParent()
      child.position.sub(pivot)
      group.add(child)
    })
    this.object.add(group)
    return { group, axis: axis.clone().normalize() }
  }
}
