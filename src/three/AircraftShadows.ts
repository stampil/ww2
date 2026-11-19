import * as THREE from 'three'
import type { D520Model } from './D520Model'

const LIFT_METERS = 0.3
const GROUND_OPACITY = 0.35
const HIGH_OPACITY = 0.1
// From this altitude on, the shadow is as faint and as soft as it gets.
const FADE_ALTITUDE_METERS = 100
// How far the blur reaches at the fade altitude, in widths of the picture of the aircraft.
const HIGH_BLUR_WIDTHS = 0.05
const BLUR_SAMPLE_COUNT = 32
const GOLDEN_ANGLE_RADIANS = Math.PI * (3 - Math.sqrt(5))

const VERTEX_SHADER = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

// The silhouette is the opacity of the picture; the blur is the mean of its opacity over a disc, sampled along a spiral.
const FRAGMENT_SHADER = `
#define SAMPLE_COUNT ${BLUR_SAMPLE_COUNT}
#define GOLDEN_ANGLE ${GOLDEN_ANGLE_RADIANS}
uniform sampler2D silhouette;
uniform float opacity;
uniform float blurWidths;
varying vec2 vUv;
void main() {
  float covered = 0.0;
  for (int index = 0; index < SAMPLE_COUNT; index++) {
    float radius = blurWidths * sqrt((float(index) + 0.5) / float(SAMPLE_COUNT));
    float angle = float(index) * GOLDEN_ANGLE;
    covered += texture2D(silhouette, vUv + radius * vec2(cos(angle), sin(angle))).a;
  }
  gl_FragColor = vec4(0.0, 0.0, 0.0, opacity * covered / float(SAMPLE_COUNT));
}
`

type Shadow = THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>

/**
 * The shadows of the aircraft on the ground: their picture seen from above, painted black, which lies farther from each aircraft, away from the sun, and
 * grows fainter and softer as it climbs. The meshes are freed with the scene.
 */
export class AircraftShadows {
  private readonly texture: THREE.Texture
  private readonly shadows = new Map<D520Model, Shadow>()
  private readonly metersPerMeterOfAltitude: THREE.Vector2
  private isLoaded = false

  /** `widthMeters` is how wide the picture is on the ground; `sunPosition` is where the sun stands over the origin. */
  constructor(
    private readonly scene: THREE.Scene,
    imageUrl: string,
    private readonly widthMeters: number,
    sunPosition: THREE.Vector3,
  ) {
    this.texture = new THREE.TextureLoader().load(imageUrl, () => {
      this.isLoaded = true
    })
    this.metersPerMeterOfAltitude = new THREE.Vector2(-sunPosition.x, -sunPosition.y).divideScalar(sunPosition.z)
  }

  /** Gives an aircraft a shadow, hidden until it is shown with the aircraft. */
  add(model: D520Model): void {
    const material = new THREE.ShaderMaterial({
      uniforms: { silhouette: { value: this.texture }, opacity: { value: GROUND_OPACITY }, blurWidths: { value: 0 } },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
    })
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(this.widthMeters, this.widthMeters), material)
    shadow.visible = false
    shadow.position.z = LIFT_METERS
    this.scene.add(shadow)
    this.shadows.set(model, shadow)
  }

  /** Lays the shadow of an aircraft that flies at this place and altitude, turned as its model is; an aircraft without a shadow, as one parked, is left alone. */
  place(model: D520Model, x: number, y: number, altitude: number, turnRadians: number): void {
    const shadow = this.shadows.get(model)
    if (shadow === undefined) {
      return
    }
    const climbShare = Math.min(altitude / FADE_ALTITUDE_METERS, 1)
    shadow.position.x = x + this.metersPerMeterOfAltitude.x * altitude
    shadow.position.y = y + this.metersPerMeterOfAltitude.y * altitude
    shadow.rotation.z = turnRadians
    shadow.material.uniforms.opacity.value = THREE.MathUtils.lerp(GROUND_OPACITY, HIGH_OPACITY, climbShare)
    shadow.material.uniforms.blurWidths.value = HIGH_BLUR_WIDTHS * climbShare
  }

  /** Shows the shadow of each aircraft that is shown, once the picture is there. */
  showWithAircraft(): void {
    for (const [model, shadow] of this.shadows) {
      shadow.visible = this.isLoaded && model.object.visible
    }
  }

  dispose(): void {
    this.texture.dispose()
  }
}
