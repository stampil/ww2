import * as THREE from 'three'

const DEGREES = Math.PI / 180
const SKIN_COLOR = 0xd9a47d
const LEATHER_COLOR = 0x5b3b24
const JACKET_COLOR = 0x6b4a2e
const SCARF_COLOR = 0xe8e4d8
const GOGGLE_FRAME_COLOR = 0x2a2a2a
const LENS_COLOR = 0x8fb4c4
const EYE_WHITE_COLOR = 0xf4f1ea
const DARK_COLOR = 0x1c1a18
const HEAD_RADIUS_METERS = 0.052
const HEAD_HEIGHT_METERS = 0.1
const HEAD_TURN_SHARE = 0.9
const MAX_YAW_DEGREES = 75
const MAX_PITCH_DEGREES = 40
const TURN_RATE_PER_SECOND = 8
const SEGMENTS = 24

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}

function part(geometry: THREE.BufferGeometry, color: number, position: THREE.Vector3): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: 0.75 }))
  mesh.position.copy(position)
  return mesh
}

/**
 * The bust of a 1940 pilot in his leather cap and goggles, seen from behind by the pilot who plays: it looks ahead, as he does, and its head turns toward the enemy, to the right
 * or the left and up or down, never past the profile, as in Wings. The model is made nose along -y and turned half way round once it is in the cockpit.
 */
export class PilotHeadModel {
  readonly object = new THREE.Group()
  private readonly head = new THREE.Group()
  private yaw = 0
  private pitch = 0

  constructor() {
    const radius = HEAD_RADIUS_METERS
    const shoulders = part(new THREE.SphereGeometry(0.075, SEGMENTS, 16), JACKET_COLOR, new THREE.Vector3(0, 0, 0))
    shoulders.scale.set(1.7, 1, 0.7)
    const neck = new THREE.CylinderGeometry(0.022, 0.026, 0.06, 12)
    neck.rotateX(Math.PI / 2)
    const scarf = new THREE.TorusGeometry(0.03, 0.011, 8, 16)
    this.object.add(shoulders, part(neck, SKIN_COLOR, new THREE.Vector3(0, 0, 0.045)), part(scarf, SCARF_COLOR, new THREE.Vector3(0, 0, 0.04)))

    const skull = part(new THREE.SphereGeometry(radius, SEGMENTS, 18), SKIN_COLOR, new THREE.Vector3(0, 0, 0))
    skull.scale.set(1, 1.05, 1.12)
    const capGeometry = new THREE.SphereGeometry(radius * 1.08, SEGMENTS, 14, 0, Math.PI * 2, 0, Math.PI * 0.58)
    capGeometry.rotateX(Math.PI / 2)
    const cap = part(capGeometry, LEATHER_COLOR, new THREE.Vector3(0, 0, 0))
    cap.scale.set(1, 1.05, 1.12)
    this.head.add(skull, cap)
    for (const side of [-1, 1]) {
      const flap = part(new THREE.SphereGeometry(radius * 0.5, 12, 10), LEATHER_COLOR, new THREE.Vector3(side * radius * 0.98, 0, -0.01))
      flap.scale.set(0.35, 0.8, 0.9)
      const lens = new THREE.CylinderGeometry(0.016, 0.016, 0.012, 16)
      const frame = new THREE.TorusGeometry(0.017, 0.003, 8, 16)
      frame.rotateX(Math.PI / 2)
      const goggleCenter = new THREE.Vector3(side * 0.024, -radius * 0.9, radius * 0.62)
      const eyeCenter = new THREE.Vector3(side * 0.02, -radius * 0.93, radius * 0.18)
      const pupilCenter = eyeCenter.clone().add(new THREE.Vector3(0, -0.007, 0))
      this.head.add(
        flap,
        part(lens, LENS_COLOR, goggleCenter),
        part(frame, GOGGLE_FRAME_COLOR, goggleCenter.clone().add(new THREE.Vector3(0, -0.005, 0))),
        part(new THREE.SphereGeometry(0.009, 12, 10), EYE_WHITE_COLOR, eyeCenter),
        part(new THREE.SphereGeometry(0.005, 10, 8), DARK_COLOR, pupilCenter),
      )
    }
    const strap = new THREE.TorusGeometry(radius * 1.06, 0.004, 6, SEGMENTS)
    const nose = part(new THREE.SphereGeometry(0.011, 12, 10), SKIN_COLOR, new THREE.Vector3(0, -radius * 1.0, -0.002))
    nose.scale.set(0.9, 1.3, 1)
    this.head.add(
      part(strap, GOGGLE_FRAME_COLOR, new THREE.Vector3(0, 0, radius * 0.55)),
      nose,
      part(new THREE.BoxGeometry(0.03, 0.006, 0.006), DARK_COLOR, new THREE.Vector3(0, -radius * 0.97, -0.018)),
    )
    this.head.position.z = HEAD_HEIGHT_METERS
    this.object.add(this.head)
  }

  /** Turns the head toward where the enemy is, in degrees to the right and up of the nose, a little more with each frame, and no further back than a profile. */
  look(azimuthDegrees: number, elevationDegrees: number, deltaSeconds: number): void {
    const share = Math.min(1, deltaSeconds * TURN_RATE_PER_SECOND)
    this.yaw += (clamp(azimuthDegrees * HEAD_TURN_SHARE, -MAX_YAW_DEGREES, MAX_YAW_DEGREES) * DEGREES - this.yaw) * share
    this.pitch += (clamp(elevationDegrees * HEAD_TURN_SHARE, -MAX_PITCH_DEGREES, MAX_PITCH_DEGREES) * DEGREES - this.pitch) * share
    this.head.rotation.set(-this.pitch, 0, Math.PI - this.yaw, 'ZXY')
  }
}
