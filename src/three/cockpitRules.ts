import * as THREE from 'three'

/** Where an aircraft is and how it points in the world of a combat: its yaw is counterclockwise seen from above, its pitch is up, its roll is about its nose. */
export type Flier = { position: THREE.Vector3; yaw: number; pitch: number; roll: number }

// How long the enemy has to be kept in the gunsight, added up over the whole fight, to be shot down: a second at the hardest, less at the easier ones, half of it on a touch screen.
const DESTRUCTION_SECONDS_BY_RISK: Record<number, number> = { 1: 0.4, 2: 0.7, 3: 1 }
const TOUCH_SCREEN_DESTRUCTION_SHARE = 0.5

/** How long the enemy has to be kept in the gunsight, in seconds, for a fight of this risk. */
export function destructionSecondsOf(risk: number, isTouchScreen: boolean): number {
  return DESTRUCTION_SECONDS_BY_RISK[risk] * (isTouchScreen ? TOUCH_SCREEN_DESTRUCTION_SHARE : 1)
}

/** The way an aircraft points: nose along +y turned by its yaw (counterclockwise seen from above) and its pitch. */
export function forwardOf(yaw: number, pitch: number): THREE.Vector3 {
  return new THREE.Vector3(-Math.sin(yaw) * Math.cos(pitch), Math.cos(yaw) * Math.cos(pitch), Math.sin(pitch))
}
