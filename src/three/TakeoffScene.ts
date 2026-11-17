import * as THREE from 'three'
import { D520Model } from './D520Model'
import { LiveryTextures } from './liveries'
import type { Livery } from './liveries'
import { createRenderer, disposeScene, fitToContainer } from './rendering'
import { Terrain } from './Terrain'
import { takeoffPose } from './takeoffPose'

const CAMERA_HEIGHT_METERS = 60
const CAMERA_FIELD_OF_VIEW_DEGREES = 30
const CAMERA_NEAR_METERS = 1
const CAMERA_FAR_METERS = 400
const LIGHT_COLOR = 0xffffff
const AMBIENT_LIGHT_INTENSITY = 1.3
const SUN_LIGHT_INTENSITY = 2.2
const SUN_POSITION = new THREE.Vector3(-30, 20, 60)
const AIRCRAFT_REST_HEIGHT_METERS = 1.2
const NOSE_ALONG_Y_ROTATION_RADIANS = Math.PI / 2
const MILLISECONDS_PER_SECOND = 1000

/** The takeoff seen from above: the 2D terrain, the 3D D.520 and a camera that follows it. Owns its WebGL canvas. */
export class TakeoffScene {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(CAMERA_FIELD_OF_VIEW_DEGREES, 1, CAMERA_NEAR_METERS, CAMERA_FAR_METERS)
  private readonly aircraft = new D520Model()
  private readonly liveries: LiveryTextures
  private readonly resizeObserver: ResizeObserver
  private readonly startMilliseconds = performance.now()
  private livery: Livery = 'french'

  constructor(private readonly container: HTMLElement) {
    this.renderer = createRenderer(container, false)
    this.liveries = new LiveryTextures(this.renderer.capabilities.getMaxAnisotropy(), (livery, texture) => {
      if (livery === this.livery) {
        this.aircraft.setLivery(texture)
      }
    })

    this.scene.add(new Terrain().object)
    this.scene.add(this.aircraft.object)
    this.scene.add(new THREE.AmbientLight(LIGHT_COLOR, AMBIENT_LIGHT_INTENSITY))
    const sun = new THREE.DirectionalLight(LIGHT_COLOR, SUN_LIGHT_INTENSITY)
    sun.position.copy(SUN_POSITION)
    this.scene.add(sun)

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
    disposeScene(this.scene, this.renderer)
    this.liveries.dispose()
  }

  private renderFrame(): void {
    const elapsedSeconds = (performance.now() - this.startMilliseconds) / MILLISECONDS_PER_SECOND
    const pose = takeoffPose(elapsedSeconds)
    this.aircraft.object.position.set(pose.x, pose.y, AIRCRAFT_REST_HEIGHT_METERS + pose.altitude)
    this.aircraft.object.rotation.set(pose.pitch, pose.roll, pose.heading - NOSE_ALONG_Y_ROTATION_RADIANS, 'ZXY')
    this.camera.position.set(pose.x, pose.y, CAMERA_HEIGHT_METERS)
    this.renderer.render(this.scene, this.camera)
  }
}
