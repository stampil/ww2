import * as THREE from 'three'

const QUARTER_TURN_RADIANS = Math.PI / 2
const CURVE_SEGMENTS = 16
// North is toward positive y.
const NORTH = 1
const SOUTH = -1

/**
 * The curve that takes an aircraft from a taxiway, which meets the runway at right angles at `junction`, onto the runway heading east: a quarter circle that starts `radiusMeters` before the junction on the taxiway and ends on the runway `radiusMeters` east of it.
 * The points run from the taxiway to the runway; the taxiway lies north of the runway when `isTaxiwayNorth`, south of it otherwise.
 */
export function junctionCurve(junction: THREE.Vector2, isTaxiwayNorth: boolean, radiusMeters: number): THREE.Vector2[] {
  const side = isTaxiwayNorth ? NORTH : SOUTH
  const center = new THREE.Vector2(junction.x + radiusMeters, junction.y + side * radiusMeters)
  const points: THREE.Vector2[] = []
  for (let segment = 0; segment <= CURVE_SEGMENTS; segment += 1) {
    const angle = Math.PI + side * QUARTER_TURN_RADIANS * (segment / CURVE_SEGMENTS)
    points.push(new THREE.Vector2(center.x + radiusMeters * Math.cos(angle), center.y + radiusMeters * Math.sin(angle)))
  }

  return points
}
