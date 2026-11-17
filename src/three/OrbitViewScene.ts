import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { createRenderer, disposeScene, fitToContainer } from './rendering'

const CAMERA_FIELD_OF_VIEW_DEGREES = 35
const CAMERA_NEAR_METERS = 0.1
const DAMPING_FACTOR = 0.08
const MILLISECONDS_PER_SECOND = 1000
const MAX_FRAME_SECONDS = 0.1
const LIGHT_COLOR = 0xffffff
const AMBIENT_LIGHT_INTENSITY = 1.2
const SUN_LIGHT_INTENSITY = 2
const SUN_POSITION = new THREE.Vector3(-30, 20, 60)
const FILL_LIGHT_INTENSITY = 0.8
const FILL_POSITION = new THREE.Vector3(30, -20, -10)
const FRAMING_SCALE = 0.8

/** `maxPolarAngleDegrees` is how far from straight above the camera may be dragged; leave it out to let it go all the way round. */
export type OrbitView = {
  cameraStart: THREE.Vector3
  target: THREE.Vector3
  farMeters: number
  isDraggable: boolean
  maxPolarAngleDegrees?: number
}

/** A subject alone on a clear background, turned in every direction by dragging unless its view is fixed. Owns its WebGL canvas. */
export abstract class OrbitViewScene {
  protected readonly renderer: THREE.WebGLRenderer
  protected readonly scene = new THREE.Scene()
  private readonly camera: THREE.PerspectiveCamera
  private readonly controls: OrbitControls
  private readonly resizeObserver: ResizeObserver
  private previousMilliseconds = performance.now()

  constructor(
    private readonly container: HTMLElement,
    view: OrbitView,
  ) {
    this.renderer = createRenderer(container, true)
    this.camera = new THREE.PerspectiveCamera(CAMERA_FIELD_OF_VIEW_DEGREES, 1, CAMERA_NEAR_METERS, view.farMeters)
    this.camera.up.set(0, 0, 1)
    this.camera.position.copy(view.cameraStart)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.target.copy(view.target)
    this.controls.enabled = view.isDraggable
    this.controls.enableZoom = false
    this.controls.enablePan = false
    if (view.maxPolarAngleDegrees !== undefined) {
      this.controls.maxPolarAngle = THREE.MathUtils.degToRad(view.maxPolarAngleDegrees)
    }
    this.controls.enableDamping = true
    this.controls.dampingFactor = DAMPING_FACTOR
    this.controls.update()

    this.scene.add(new THREE.AmbientLight(LIGHT_COLOR, AMBIENT_LIGHT_INTENSITY))
    const sun = new THREE.DirectionalLight(LIGHT_COLOR, SUN_LIGHT_INTENSITY)
    sun.position.copy(SUN_POSITION)
    this.scene.add(sun)
    const fill = new THREE.DirectionalLight(LIGHT_COLOR, FILL_LIGHT_INTENSITY)
    fill.position.copy(FILL_POSITION)
    this.scene.add(fill)

    this.resizeObserver = new ResizeObserver(() => fitToContainer(this.renderer, this.camera, this.container))
    this.resizeObserver.observe(container)
    fitToContainer(this.renderer, this.camera, container)
    this.renderer.setAnimationLoop(() => this.renderFrame())
  }

  dispose(): void {
    this.renderer.setAnimationLoop(null)
    this.resizeObserver.disconnect()
    this.controls.dispose()
    disposeScene(this.scene, this.renderer)
  }

  /** Aims the camera at a subject whose bounding sphere is known, from where it stands now, far enough back for the subject to fill the view; an aircraft is flat, so it fills less than its sphere. */
  protected frame(center: THREE.Vector3, radiusMeters: number): void {
    const halfFieldOfViewRadians = THREE.MathUtils.degToRad(CAMERA_FIELD_OF_VIEW_DEGREES / 2)
    const distanceMeters = (radiusMeters * FRAMING_SCALE) / Math.sin(halfFieldOfViewRadians)
    const direction = this.camera.position.clone().sub(this.controls.target).normalize()
    this.controls.target.copy(center)
    this.camera.position.copy(center).addScaledVector(direction, distanceMeters)
    this.controls.update()
  }

  /** Moves the subject on by one frame. */
  protected abstract advance(deltaSeconds: number): void

  private renderFrame(): void {
    const now = performance.now()
    const deltaSeconds = Math.min((now - this.previousMilliseconds) / MILLISECONDS_PER_SECOND, MAX_FRAME_SECONDS)
    this.previousMilliseconds = now
    this.advance(deltaSeconds)
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }
}
