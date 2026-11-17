import * as THREE from 'three'

const THRUST_AXIS_HEIGHT_METERS = 0.327

/** A point from d520.xml (x aft, y right, z up, origin of the FlightGear model) in our frame (x right, y nose, z up). */
export function pointFromFlightGear(x: number, y: number, z: number): THREE.Vector3 {
  return new THREE.Vector3(y, -x, z - THRUST_AXIS_HEIGHT_METERS)
}

/** A direction from d520.xml in our frame. */
export function directionFromFlightGear(x: number, y: number, z: number): THREE.Vector3 {
  return new THREE.Vector3(y, -x, z)
}
