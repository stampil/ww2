import * as THREE from 'three'
import { d520AxisHeightOnGround, D520Model } from './D520Model'
import { LiveryTextures } from './liveries'
import type { Livery } from './liveries'
import { createRenderer, disposeScene, fitToContainer } from './rendering'
import { Terrain } from './Terrain'
import { Takeoff } from './Takeoff'
import type { TakeoffPose } from './Takeoff'

const CAMERA_HEIGHT_METERS = 60
const CAMERA_FIELD_OF_VIEW_DEGREES = 30
const CAMERA_NEAR_METERS = 1
const CAMERA_FAR_METERS = 1500
const FRONT_CAMERA_DISTANCE_METERS = 18
const FRONT_CAMERA_HEIGHT_METERS = 8
const FOG_NEAR_METERS = 200
// The average color of public/textures/herbe.png, for the fog and for what lies beyond the far plane.
const GRASS_COLOR = 0x6d7231
const WORLD_UP = new THREE.Vector3(0, 0, 1)
// The seed of the terrain of the proof of concept: the API gives the same airfield for the same seed.
const TERRAIN_SEED = 1940
const TOP_DOWN_ORIENTATION = new THREE.Quaternion()
const LIGHT_COLOR = 0xffffff
const AMBIENT_LIGHT_INTENSITY = 1.3
const SUN_LIGHT_INTENSITY = 2.2
const SUN_POSITION = new THREE.Vector3(-30, 20, 60)
const NOSE_ALONG_Y_ROTATION_RADIANS = Math.PI / 2
const MILLISECONDS_PER_SECOND = 1000

/** The takeoff seen from above, then from the front: the 2D terrain, the 3D D.520 and a camera that follows it. Owns its WebGL canvas. */
export class TakeoffScene {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(CAMERA_FIELD_OF_VIEW_DEGREES, 1, CAMERA_NEAR_METERS, CAMERA_FAR_METERS)
  private readonly aircraft = new D520Model()
  private readonly liveries: LiveryTextures
  private readonly resizeObserver: ResizeObserver
  private takeoff: Takeoff | undefined
  private startMilliseconds = 0
  private previousElapsedSeconds = 0
  private readonly topPosition = new THREE.Vector3()
  private readonly frontPosition = new THREE.Vector3()
  private readonly lookMatrix = new THREE.Matrix4()
  private readonly frontOrientation = new THREE.Quaternion()
  private livery: Livery = 'french'

  constructor(private readonly container: HTMLElement) {
    this.renderer = createRenderer(container, false)
    this.liveries = new LiveryTextures(this.renderer.capabilities.getMaxAnisotropy(), (livery, texture) => {
      if (livery === this.livery) {
        this.aircraft.setLivery(texture)
      }
    })

    this.scene.background = new THREE.Color(GRASS_COLOR)
    this.scene.fog = new THREE.Fog(GRASS_COLOR, FOG_NEAR_METERS, CAMERA_FAR_METERS)
    const terrain = new Terrain(TERRAIN_SEED, this.renderer.capabilities.getMaxAnisotropy())
    void terrain.runwayLengthMeters.then((runwayLengthMeters) => this.startTakeoff(runwayLengthMeters))
    this.scene.add(terrain.object)
    this.aircraft.object.visible = false
    this.scene.add(this.aircraft.object)
    this.camera.position.set(0, 0, CAMERA_HEIGHT_METERS)
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

  /** The aircraft appears and takes off along the runway that the terrain has. */
  private startTakeoff(runwayLengthMeters: number): void {
    this.takeoff = new Takeoff(runwayLengthMeters)
    this.startMilliseconds = performance.now()
    this.aircraft.object.visible = true
  }

  private renderFrame(): void {
    if (this.takeoff === undefined) {
      this.renderer.render(this.scene, this.camera)
      return
    }
    const elapsedSeconds = (performance.now() - this.startMilliseconds) / MILLISECONDS_PER_SECOND
    const pose = this.takeoff.pose(elapsedSeconds)
    this.aircraft.setState(pose.state)
    this.aircraft.update(elapsedSeconds - this.previousElapsedSeconds)
    this.previousElapsedSeconds = elapsedSeconds
    this.aircraft.object.position.set(pose.x, pose.y, d520AxisHeightOnGround(pose.pitch) + pose.altitude)
    this.aircraft.object.rotation.set(pose.pitch, pose.roll, pose.heading - NOSE_ALONG_Y_ROTATION_RADIANS, 'ZXY')
    this.placeCamera(pose)
    this.renderer.render(this.scene, this.camera)
  }

  /** Above the aircraft looking down, swinging to in front of it and a little above, looking back at it. */
  private placeCamera(pose: TakeoffPose): void {
    const aircraft = this.aircraft.object.position
    this.topPosition.set(aircraft.x, aircraft.y, CAMERA_HEIGHT_METERS)
    this.frontPosition.set(
      aircraft.x + Math.cos(pose.heading) * FRONT_CAMERA_DISTANCE_METERS,
      aircraft.y + Math.sin(pose.heading) * FRONT_CAMERA_DISTANCE_METERS,
      aircraft.z + FRONT_CAMERA_HEIGHT_METERS,
    )
    this.lookMatrix.lookAt(this.frontPosition, aircraft, WORLD_UP)
    this.frontOrientation.setFromRotationMatrix(this.lookMatrix)
    this.camera.position.lerpVectors(this.topPosition, this.frontPosition, pose.frontView)
    this.camera.quaternion.slerpQuaternions(TOP_DOWN_ORIENTATION, this.frontOrientation, pose.frontView)
  }
}
