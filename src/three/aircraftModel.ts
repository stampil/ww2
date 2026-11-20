import type * as THREE from 'three'
import type { AircraftState } from './aircraftState'
import type { AircraftControl } from './D520Model'

/**
 * What the scenes ask of the 3D model of an aircraft, whatever its type: nose along +y, right wing along +x, up along +z, in meters, shown once `ready` has settled.
 * An aircraft that has no such part (a cockpit, a collimator sight, a canopy) leaves the matching call without effect.
 */
export interface AircraftModel3D {
  readonly object: THREE.Group
  readonly ready: Promise<void>
  /** The wingspan of the model, measured on it. */
  readonly spanMeters: number
  /** The nose-up angle at rest, where the main wheels and the tail wheel both touch the ground. */
  readonly groundPitchRadians: number
  /** How high the thrust axis stands above the ground when the main wheels are on it and the nose is up by `pitchRadians`. */
  axisHeightOnGround(pitchRadians: number): number
  /** Paints the number of the aircraft on its fin; undefined takes it off. */
  setTailNumber(tailNumber: number | undefined): void
  setLivery(texture: THREE.Texture): void
  /** The velocity of the aircraft in its own frame, in meters per second: the smoke trails against it. */
  setVelocity(velocity: THREE.Vector3): void
  /** One more level of damage, up to destruction; returns the level reached. */
  inflictDamage(): number
  /** Puts the aircraft back in one piece, without damage. */
  repair(): void
  hideGunsight(): void
  hideRearCanopy(): void
  hideGlass(): void
  /** Starts or stops one animation: it eases in and out. */
  setControl(control: AircraftControl, isActive: boolean): void
  /** Puts every moving part where the state says, at once, for a flight that drives them. */
  setState(state: AircraftState): void
  update(deltaSeconds: number): void
}
