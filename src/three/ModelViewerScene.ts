import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { D520Model } from './D520Model'
import { LiveryTextures } from './liveries'
import type { Livery } from './liveries'
import { createRenderer, disposeScene, fitToContainer } from './rendering'

const CAMERA_FIELD_OF_VIEW_DEGREES = 35
const CAMERA_NEAR_METERS = 1
const CAMERA_FAR_METERS = 100
const CAMERA_START = new THREE.Vector3(-8, 9, 6)
const CAMERA_TARGET = new THREE.Vector3(0, 0, -0.2)
const DAMPING_FACTOR = 0.08
const LIGHT_COLOR = 0xffffff
const AMBIENT_LIGHT_INTENSITY = 1.2
const SUN_LIGHT_INTENSITY = 2
const SUN_POSITION = new THREE.Vector3(-30, 20, 60)
const FILL_LIGHT_INTENSITY = 0.8
const FILL_POSITION = new THREE.Vector3(30, -20, -10)

/** The D.520 alone on a clear background, turned in every direction by dragging. Owns its WebGL canvas. */
export class ModelViewerScene {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(CAMERA_FIELD_OF_VIEW_DEGREES, 1, CAMERA_NEAR_METERS, CAMERA_FAR_METERS)
  private readonly controls: OrbitControls
  private readonly aircraft = new D520Model()
  private readonly liveries: LiveryTextures
  private readonly resizeObserver: ResizeObserver
  private livery: Livery = 'french'

  constructor(private readonly container: HTMLElement) {
    this.renderer = createRenderer(container, true)
    this.liveries = new LiveryTextures(this.renderer.capabilities.getMaxAnisotropy(), (livery, texture) => {
      if (livery === this.livery) {
        this.aircraft.setLivery(texture)
      }
    })

    this.camera.up.set(0, 0, 1)
    this.camera.position.copy(CAMERA_START)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.target.copy(CAMERA_TARGET)
    this.controls.enableZoom = false
    this.controls.enablePan = false
    this.controls.enableDamping = true
    this.controls.dampingFactor = DAMPING_FACTOR
    this.controls.update()

    this.scene.add(this.aircraft.object)
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

  setLivery(livery: Livery): void {
    this.livery = livery
    const texture = this.liveries.get(livery)
    if (texture !== undefined) {
      this.aircraft.setLivery(texture)
    }
  }

  dispose(): void {
    this.renderer.setAnimationLoop(null)
    this.resizeObserver.disconnect()
    this.controls.dispose()
    disposeScene(this.scene, this.renderer)
    this.liveries.dispose()
  }

  private renderFrame(): void {
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }
}
