import * as THREE from 'three'
import { assetUrl } from '../assetUrl'

const DEGREES = Math.PI / 180
const PHOTOS_PATH = 'models/pilot/'
// How long a pixel of the photos is in real life: the head, from the crown to the chin, is about 23 centimeters.
const PIXEL_METERS = 0.00069
const RING_POINTS = 56
const HEAD_EXPONENT = 2.4
const BODY_EXPONENT = 3
// The photos cut the shoulders at their edges: with them the head would be too big, as a child's is, so the body is widened to the shoulders of a man.
const SHOULDER_WIDENING = 1.45
const HEAD_TURN_SHARE = 0.9
const MAX_YAW_DEGREES = 75
const MAX_PITCH_DEGREES = 40
const TURN_RATE_PER_SECOND = 8
// How sharply the photo that faces a surface wins over the others on it.
const PROJECTION_SHARPNESS = 4

type Ring = { row: number; middleX: number; halfWidth: number; middleY: number; halfDepth: number }
type Sections = {
  rows: { crown: number; neck: number; chin: number }
  photos: { back: { width: number; centerX: number }; front: { width: number; centerX: number }; side: { width: number; axisX: number }; height: number }
  head: Ring[]
  body: Ring[]
}

const VERTEX_SHADER = `
varying vec3 vPosition;
varying vec3 vNormal;
void main() {
  vPosition = position;
  vNormal = normal;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

// Each photo is laid on the shape by looking at it from the side the photo was taken from: the back and the front along the nose, the side along the shoulders.
const FRAGMENT_SHADER = `
uniform sampler2D backPhoto;
uniform sampler2D frontPhoto;
uniform sampler2D sidePhoto;
uniform float pixelMeters;
uniform float neckRow;
uniform float photoHeight;
uniform vec3 backFrame;
uniform vec3 frontFrame;
uniform vec3 sideFrame;
uniform float sharpness;
varying vec3 vPosition;
varying vec3 vNormal;

float rowOf(vec3 place) {
  return neckRow - place.z / pixelMeters;
}

void main() {
  vec3 normal = normalize(vNormal);
  float row = rowOf(vPosition);
  vec2 backUv = vec2((backFrame.y + vPosition.x / pixelMeters) / backFrame.x, 1.0 - row / photoHeight);
  vec2 frontUv = vec2((frontFrame.y - vPosition.x / pixelMeters) / frontFrame.x, 1.0 - row / photoHeight);
  vec2 sideUv = vec2((sideFrame.y - vPosition.y / pixelMeters) / sideFrame.x, 1.0 - row / photoHeight);
  // The back photo also paints what faces up or down, which no photo was taken of.
  float backWeight = pow(max(-normal.y, 0.0), sharpness) + 0.02;
  float frontWeight = pow(max(normal.y, 0.0), sharpness);
  float sideWeight = pow(abs(normal.x), sharpness);
  vec3 color = texture2D(backPhoto, backUv).rgb * backWeight + texture2D(frontPhoto, frontUv).rgb * frontWeight + texture2D(sidePhoto, sideUv).rgb * sideWeight;
  gl_FragColor = vec4(color / (backWeight + frontWeight + sideWeight + 1e-4), 1.0);
  #include <colorspace_fragment>
}`

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}

/** A point of the rounded section that fills a half width by a half depth: the larger the exponent, the squarer it is. */
function roundedSection(angle: number, exponent: number): { x: number; y: number } {
  const power = 2 / exponent
  return { x: Math.sign(Math.cos(angle)) * Math.abs(Math.cos(angle)) ** power, y: Math.sign(Math.sin(angle)) * Math.abs(Math.sin(angle)) ** power }
}

/**
 * A shape made of rings stacked from the crown down, as a fuselage is: each ring is a rounded section as wide and as deep as the pilot is on that row of the photos.
 * The model is made with the nose along +y, the right of the pilot along +x and up along +z, its origin on the axis of the neck.
 */
function loftOf(rings: Ring[], sections: Sections, exponent: number): THREE.BufferGeometry {
  const positions: number[] = []
  const indices: number[] = []
  for (const ring of rings) {
    for (let point = 0; point < RING_POINTS; point += 1) {
      // The nose is toward the left of the side photo, so the depth runs the other way round: the points go round the other way to keep the faces outward.
      const section = roundedSection(-(point / RING_POINTS) * Math.PI * 2, exponent)
      positions.push(
        (ring.middleX - sections.photos.back.centerX + section.x * ring.halfWidth) * PIXEL_METERS,
        (sections.photos.side.axisX - (ring.middleY + section.y * ring.halfDepth)) * PIXEL_METERS,
        (sections.rows.neck - ring.row) * PIXEL_METERS,
      )
    }
  }
  for (let ring = 0; ring < rings.length - 1; ring += 1) {
    for (let point = 0; point < RING_POINTS; point += 1) {
      const next = (point + 1) % RING_POINTS
      const a = ring * RING_POINTS + point
      const b = ring * RING_POINTS + next
      const c = (ring + 1) * RING_POINTS + point
      const d = (ring + 1) * RING_POINTS + next
      indices.push(a, c, b, b, c, d)
    }
  }
  for (const [ring, isTop] of [[0, true], [rings.length - 1, false]] as const) {
    const center = positions.length / 3
    const first = ring * RING_POINTS
    const middle = { x: 0, y: 0, z: 0 }
    for (let point = 0; point < RING_POINTS; point += 1) {
      middle.x += positions[(first + point) * 3] / RING_POINTS
      middle.y += positions[(first + point) * 3 + 1] / RING_POINTS
      middle.z += positions[(first + point) * 3 + 2] / RING_POINTS
    }
    positions.push(middle.x, middle.y, middle.z)
    for (let point = 0; point < RING_POINTS; point += 1) {
      const next = (point + 1) % RING_POINTS
      indices.push(...(isTop ? [center, first + point, first + next] : [center, first + next, first + point]))
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function loadPhoto(name: string): Promise<THREE.Texture> {
  return new THREE.TextureLoader().loadAsync(assetUrl(`${PHOTOS_PATH}${name}.jpg`)).then((texture) => {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 4
    return texture
  })
}

/**
 * The bust of a 1940 pilot in his helmet, goggles and sheepskin collar, seen from behind: its head turns toward the enemy, never past the profile, as in Wings.
 * Head and body are shapes lofted from the outline of a pilot on three photographs, and painted with them; it shows once they have loaded.
 */
export class PilotHeadModel {
  readonly object = new THREE.Group()
  private readonly head = new THREE.Group()
  private readonly photos: THREE.Texture[] = []
  private yaw = 0
  private pitch = 0

  constructor() {
    this.object.add(this.head)
    void this.load()
  }

  private async load(): Promise<void> {
    const [sections, back, front, side] = await Promise.all([
      fetch(assetUrl(`${PHOTOS_PATH}sections.json`)).then((response) => response.json() as Promise<Sections>),
      loadPhoto('back'),
      loadPhoto('front'),
      loadPhoto('side'),
    ])
    this.photos.push(back, front, side)
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: {
        backPhoto: { value: back },
        frontPhoto: { value: front },
        sidePhoto: { value: side },
        pixelMeters: { value: PIXEL_METERS },
        neckRow: { value: sections.rows.neck },
        photoHeight: { value: sections.photos.height },
        backFrame: { value: new THREE.Vector3(sections.photos.back.width, sections.photos.back.centerX, 0) },
        frontFrame: { value: new THREE.Vector3(sections.photos.front.width, sections.photos.front.centerX, 0) },
        sideFrame: { value: new THREE.Vector3(sections.photos.side.width, sections.photos.side.axisX, 0) },
        sharpness: { value: PROJECTION_SHARPNESS },
      },
    })
    this.head.add(new THREE.Mesh(loftOf(sections.head, sections, HEAD_EXPONENT), material))
    const body = new THREE.Mesh(loftOf(sections.body, sections, BODY_EXPONENT), material)
    body.scale.x = SHOULDER_WIDENING
    this.object.add(body)
  }

  /** Frees the photos, which the materials of the scene do not hold as maps. */
  dispose(): void {
    this.photos.forEach((photo) => photo.dispose())
  }

  /** Turns the head toward where the enemy is, in degrees to the right and up of the nose, a little more with each frame, and no further back than a profile. */
  look(azimuthDegrees: number, elevationDegrees: number, deltaSeconds: number): void {
    const share = Math.min(1, deltaSeconds * TURN_RATE_PER_SECOND)
    this.yaw += (clamp(azimuthDegrees * HEAD_TURN_SHARE, -MAX_YAW_DEGREES, MAX_YAW_DEGREES) * DEGREES - this.yaw) * share
    this.pitch += (clamp(elevationDegrees * HEAD_TURN_SHARE, -MAX_PITCH_DEGREES, MAX_PITCH_DEGREES) * DEGREES - this.pitch) * share
    this.head.rotation.set(this.pitch, 0, -this.yaw, 'ZXY')
  }
}
