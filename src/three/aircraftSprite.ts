import * as THREE from 'three'
import { D520Model } from './D520Model'
import { LiveryTextures } from './liveries'
import type { Livery } from './liveries'
import { disposeScene } from './rendering'

const SPRITE_PIXELS = 512
const VIEW_HALF_METERS = 6
/** How wide the picture is on the ground, in meters, at the true size of the aircraft. */
export const AIRCRAFT_SPRITE_WIDTH_METERS = 2 * VIEW_HALF_METERS
const CAMERA_HEIGHT_METERS = 20
const CAMERA_FAR_METERS = 50
const LIGHT_COLOR = 0xffffff
const AMBIENT_LIGHT_INTENSITY = 1.4
const SUN_LIGHT_INTENSITY = 2
const SUN_POSITION = new THREE.Vector3(-10, 8, 30)

async function render(livery: Livery): Promise<string> {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
  renderer.setPixelRatio(1)
  renderer.setSize(SPRITE_PIXELS, SPRITE_PIXELS, false)
  const scene = new THREE.Scene()
  scene.add(new THREE.AmbientLight(LIGHT_COLOR, AMBIENT_LIGHT_INTENSITY))
  const sun = new THREE.DirectionalLight(LIGHT_COLOR, SUN_LIGHT_INTENSITY)
  sun.position.copy(SUN_POSITION)
  scene.add(sun)
  // Seen from straight above with the nose up the picture: nose along +y, right wing along +x.
  const camera = new THREE.OrthographicCamera(-VIEW_HALF_METERS, VIEW_HALF_METERS, VIEW_HALF_METERS, -VIEW_HALF_METERS, 0.1, CAMERA_FAR_METERS)
  camera.up.set(0, 1, 0)
  camera.position.set(0, 0, CAMERA_HEIGHT_METERS)
  camera.lookAt(0, 0, 0)

  const aircraft = new D520Model()
  scene.add(aircraft.object)
  let liveries: LiveryTextures | undefined
  const texture = await new Promise<THREE.Texture>((resolve) => {
    liveries = new LiveryTextures(renderer.capabilities.getMaxAnisotropy(), (loaded, loadedTexture) => {
      if (loaded === livery) {
        resolve(loadedTexture)
      }
    })
  })
  await aircraft.ready
  aircraft.setLivery(texture)
  renderer.render(scene, camera)
  const url = renderer.domElement.toDataURL('image/png')
  liveries?.dispose()
  disposeScene(scene, renderer)
  return url
}

const sprites = new Map<Livery, Promise<string>>()

/** The aircraft seen from above, as a picture of its own, drawn once from the 3D model and kept. */
export function aircraftSprite(livery: Livery): Promise<string> {
  let sprite = sprites.get(livery)
  if (sprite === undefined) {
    sprite = render(livery)
    sprites.set(livery, sprite)
  }
  return sprite
}
