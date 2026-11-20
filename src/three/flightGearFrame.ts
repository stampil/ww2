import * as THREE from 'three'

const THRUST_AXIS_HEIGHT_METERS = 0.327

/** A point from the xml of a FlightGear model (x aft, y right, z up, origin of the FlightGear model) in our frame (x right, y nose, z up), where the converter has lowered the model by `lowering` meters. */
export function pointFromFlightGear(x: number, y: number, z: number, lowering = THRUST_AXIS_HEIGHT_METERS): THREE.Vector3 {
  return new THREE.Vector3(y, -x, z - lowering)
}

/** A direction from the xml of a FlightGear model in our frame. */
export function directionFromFlightGear(x: number, y: number, z: number): THREE.Vector3 {
  return new THREE.Vector3(y, -x, z)
}
