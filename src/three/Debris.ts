import * as THREE from 'three'
import { randomBetween } from './motion'
import type { Range } from './motion'

const SPEED_METERS_PER_SECOND: Range = { min: 3, max: 7 }
const LIFT_METERS_PER_SECOND = 4
const SPIN_RADIANS_PER_SECOND: Range = { min: -6, max: 6 }
const SCATTER_METERS: Range = { min: -0.5, max: 0.5 }
const FLIGHT_SECONDS = 4
const GRAVITY_METERS_PER_SECOND_SQUARED = 9.8

type Piece = {
  object: THREE.Object3D
  position: THREE.Vector3
  quaternion: THREE.Quaternion
  velocity: THREE.Vector3
  spin: THREE.Vector3
  age: number
}

/** Parts torn off the aircraft: they fly outward, tumble and fall out of sight, and can be put back. */
export class Debris {
  private pieces: Piece[] = []

  get isFlying(): boolean {
    return this.pieces.length > 0
  }

  tearOff(objects: THREE.Object3D[]): void {
    this.pieces = objects.map((object) => {
      const direction = object.position
        .clone()
        .add(new THREE.Vector3(randomBetween(SCATTER_METERS), randomBetween(SCATTER_METERS), randomBetween(SCATTER_METERS)))
        .normalize()
      const velocity = direction.multiplyScalar(randomBetween(SPEED_METERS_PER_SECOND))
      velocity.z += LIFT_METERS_PER_SECOND
      const spin = new THREE.Vector3(randomBetween(SPIN_RADIANS_PER_SECOND), randomBetween(SPIN_RADIANS_PER_SECOND), randomBetween(SPIN_RADIANS_PER_SECOND))
      return { object, position: object.position.clone(), quaternion: object.quaternion.clone(), velocity, spin, age: 0 }
    })
  }

  update(deltaSeconds: number): void {
    for (const piece of this.pieces) {
      piece.age += deltaSeconds
      piece.velocity.z -= GRAVITY_METERS_PER_SECOND_SQUARED * deltaSeconds
      piece.object.position.addScaledVector(piece.velocity, deltaSeconds)
      piece.object.rotation.x += piece.spin.x * deltaSeconds
      piece.object.rotation.y += piece.spin.y * deltaSeconds
      piece.object.rotation.z += piece.spin.z * deltaSeconds
      piece.object.visible = piece.age < FLIGHT_SECONDS
    }
  }

  putBack(): void {
    for (const piece of this.pieces) {
      piece.object.position.copy(piece.position)
      piece.object.quaternion.copy(piece.quaternion)
      piece.object.visible = true
    }
    this.pieces = []
  }
}
