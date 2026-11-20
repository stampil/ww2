import * as THREE from 'three'
import { clamp } from './easing'

/** Where an aircraft is and how it points in the world of a combat: its yaw is counterclockwise seen from above, its pitch is up, its roll is about its nose. */
export type Flier = { position: THREE.Vector3; yaw: number; pitch: number; roll: number }

const DEGREES = Math.PI / 180

// How long the enemy has to be kept in the gunsight, added up over the whole fight, to be shot down: a second at the hardest, less at the easier ones, half of it on a touch screen.
const DESTRUCTION_SECONDS_BY_RISK: Record<number, number> = { 1: 0.4, 2: 0.7, 3: 1 }
const TOUCH_SCREEN_DESTRUCTION_SHARE = 0.5

/** The risk of the easiest fights, which are flown in a wide corridor. */
export const EASIEST_RISK = 1

// In the corridor the enemy keeps to a point that wanders in front of the player's nose within these limits, at a distance that the gunsight reaches.
const CORRIDOR_AZIMUTH_DEGREES = 25
const CORRIDOR_ELEVATION_DEGREES = 12
const CORRIDOR_DISTANCE_METERS = { min: 90, max: 190 }
// It flies the way the player flies, turned toward its point by this many times the angle it is off by, up to this much.
const CORRIDOR_STEER_GAIN = 1.5
const CORRIDOR_MAX_STEER_RADIANS = 35 * DEGREES
// More than the player's own limit of 70 degrees, so that it can follow him up and down.
const CORRIDOR_MAX_PITCH_RADIANS = 75 * DEGREES
const CORRIDOR_SPEED_GAIN_PER_SECOND = 1
// How much slower and faster than the player the enemy may fly to hold its distance.
const CORRIDOR_SPEED_MARGIN_METERS_PER_SECOND = { slower: 20, faster: 30 }
// However the player turns, the enemy is never less far ahead of his nose than this: it is never behind him, and he never gets past it.
const CORRIDOR_MIN_AHEAD_METERS = 50
/** The enemy in the corridor turns faster than the player can, so that it never falls behind his turns. */
export const CORRIDOR_TURN_RATE_RADIANS_PER_SECOND = 1.8

/** A place in front of the player, as he sees it from his nose: to the right and up, and how far. */
export type CorridorPoint = { azimuthRadians: number; elevationRadians: number; distanceMeters: number }

/** How long the enemy has to be kept in the gunsight, in seconds, for a fight of this risk. */
export function destructionSecondsOf(risk: number, isTouchScreen: boolean): number {
  return DESTRUCTION_SECONDS_BY_RISK[risk] * (isTouchScreen ? TOUCH_SCREEN_DESTRUCTION_SHARE : 1)
}

/** The way an aircraft points: nose along +y turned by its yaw (counterclockwise seen from above) and its pitch. */
export function forwardOf(yaw: number, pitch: number): THREE.Vector3 {
  return new THREE.Vector3(-Math.sin(yaw) * Math.cos(pitch), Math.cos(yaw) * Math.cos(pitch), Math.sin(pitch))
}

export function drawCorridorPoint(): CorridorPoint {
  return {
    azimuthRadians: (Math.random() * 2 - 1) * CORRIDOR_AZIMUTH_DEGREES * DEGREES,
    elevationRadians: (Math.random() * 2 - 1) * CORRIDOR_ELEVATION_DEGREES * DEGREES,
    distanceMeters: CORRIDOR_DISTANCE_METERS.min + Math.random() * (CORRIDOR_DISTANCE_METERS.max - CORRIDOR_DISTANCE_METERS.min),
  }
}

/** Where a place is, to the right and up of the nose of the player, in radians, without counting the bank of his aircraft. */
function anglesFromNose(position: THREE.Vector3, player: Flier): { azimuth: number; elevation: number } {
  const local = position.clone().sub(player.position).applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(player.pitch, 0, player.yaw, 'ZXY')).invert())
  return { azimuth: Math.atan2(local.x, local.y), elevation: Math.atan2(local.z, Math.hypot(local.x, local.y)) }
}

/** The yaw and the pitch of the enemy: the way the player points, turned toward the point it keeps to, so that it follows his turns and drifts back to its place. */
export function corridorHeading(point: CorridorPoint, enemy: Flier, player: Flier): { yaw: number; pitch: number } {
  const seen = anglesFromNose(enemy.position, player)
  const steerYaw = clamp(CORRIDOR_STEER_GAIN * (point.azimuthRadians - seen.azimuth), -CORRIDOR_MAX_STEER_RADIANS, CORRIDOR_MAX_STEER_RADIANS)
  const steerPitch = clamp(CORRIDOR_STEER_GAIN * (point.elevationRadians - seen.elevation), -CORRIDOR_MAX_STEER_RADIANS, CORRIDOR_MAX_STEER_RADIANS)
  return { yaw: player.yaw - steerYaw, pitch: clamp(player.pitch + steerPitch, -CORRIDOR_MAX_PITCH_RADIANS, CORRIDOR_MAX_PITCH_RADIANS) }
}

/** The speed that brings the enemy to the distance ahead of the player that its point asks for: faster when it is too close, slower when it is too far. */
export function corridorSpeed(point: CorridorPoint, enemy: Flier, player: Flier, playerSpeed: number): number {
  const ahead = enemy.position.clone().sub(player.position).dot(forwardOf(player.yaw, player.pitch))
  const wanted = point.distanceMeters * Math.cos(point.azimuthRadians) * Math.cos(point.elevationRadians)
  const speed = playerSpeed + CORRIDOR_SPEED_GAIN_PER_SECOND * (wanted - ahead)
  return clamp(speed, playerSpeed - CORRIDOR_SPEED_MARGIN_METERS_PER_SECOND.slower, playerSpeed + CORRIDOR_SPEED_MARGIN_METERS_PER_SECOND.faster)
}

/** Pushes the enemy ahead along the nose of the player if a sharp turn of his has left it less far ahead than the corridor allows. */
export function keepAhead(enemy: Flier, player: Flier): void {
  const nose = forwardOf(player.yaw, player.pitch)
  const ahead = enemy.position.clone().sub(player.position).dot(nose)
  if (ahead < CORRIDOR_MIN_AHEAD_METERS) {
    enemy.position.addScaledVector(nose, CORRIDOR_MIN_AHEAD_METERS - ahead)
  }
}
