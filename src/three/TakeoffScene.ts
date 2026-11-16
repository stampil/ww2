import * as THREE from 'three'
import { D520Model } from './D520Model'
import { createTerrain } from './Terrain'
import { takeoffPose } from './takeoffPose'

export type Livery = 'french' | 'german'

const TEXTURE_URLS: Record<Livery, string> = {
  french: '/textures/d520-francais.png',
  german: '/textures/d520-allemand.png',
}
const CAMERA_HEIGHT_METERS = 60
const CAMERA_FIELD_OF_VIEW_DEGREES = 30
const CAMERA_NEAR_METERS = 1
const CAMERA_FAR_METERS = 400
const MAX_PIXEL_RATIO = 2
const LIGHT_COLOR = 0xffffff
const AMBIENT_LIGHT_INTENSITY = 1.3
const SUN_LIGHT_INTENSITY = 2.2
const SUN_POSITION = new THREE.Vector3(-30, 20, 60)
const AIRCRAFT_REST_HEIGHT_METERS = 1.2
const NOSE_ALONG_Y_ROTATION_RADIANS = Math.PI / 2
const MILLISECONDS_PER_SECOND = 1000

function disposeMaterial(material: THREE.Material): void {
  if (material instanceof THREE.MeshBasicMaterial || material instanceof THREE.MeshStandardMaterial) {
    material.map?.dispose()
  }
  material.dispose()
}

/** The takeoff seen from above: the 2D terrain, the 3D D.520 and a camera that follows it. Owns its WebGL canvas. */
export class TakeoffScene {
  private readonly renderer = new THREE.WebGLRenderer({ antialias: true })
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(CAMERA_FIELD_OF_VIEW_DEGREES, 1, CAMERA_NEAR_METERS, CAMERA_FAR_METERS)
  private readonly aircraft = new D520Model()
  private readonly textures: Partial<Record<Livery, THREE.Texture>> = {}
  private readonly resizeObserver: ResizeObserver
  private readonly startMilliseconds = performance.now()
  private livery: Livery = 'french'

  constructor(private readonly container: HTMLElement) {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO))
    container.appendChild(this.renderer.domElement)

    this.scene.add(createTerrain())
    this.scene.add(this.aircraft.object)
    this.scene.add(new THREE.AmbientLight(LIGHT_COLOR, AMBIENT_LIGHT_INTENSITY))
    const sun = new THREE.DirectionalLight(LIGHT_COLOR, SUN_LIGHT_INTENSITY)
    sun.position.copy(SUN_POSITION)
    this.scene.add(sun)

    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(container)
    this.resize()
    this.loadTextures()
    this.renderer.setAnimationLoop(() => this.renderFrame())
  }

  setLivery(livery: Livery): void {
    this.livery = livery
    const texture = this.textures[livery]
    if (texture !== undefined) {
      this.aircraft.setLivery(texture)
    }
  }

  dispose(): void {
    this.renderer.setAnimationLoop(null)
    this.resizeObserver.disconnect()
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose()
        const materials: THREE.Material[] = Array.isArray(object.material) ? object.material : [object.material]
        materials.forEach(disposeMaterial)
      }
    })
    Object.values(this.textures).forEach((texture) => texture.dispose())
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }

  private loadTextures(): void {
    const loader = new THREE.TextureLoader()
    const liveries = Object.keys(TEXTURE_URLS) as Livery[]
    for (const livery of liveries) {
      loader.load(TEXTURE_URLS[livery], (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace
        texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy()
        this.textures[livery] = texture
        if (livery === this.livery) {
          this.aircraft.setLivery(texture)
        }
      })
    }
  }

  private resize(): void {
    const { clientWidth, clientHeight } = this.container
    this.renderer.setSize(clientWidth, clientHeight, false)
    this.camera.aspect = clientWidth / clientHeight
    this.camera.updateProjectionMatrix()
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
