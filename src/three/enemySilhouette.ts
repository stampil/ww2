import * as THREE from 'three'
import { assetUrl } from '../assetUrl'
import { buildGeometry, loadModelData } from './ac3d'
import { disposeScene } from './rendering'

const SILHOUETTE_PIXELS = 160
const FRAMING_MARGIN = 1.08
const CAMERA_HEIGHT_METERS = 50
const CAMERA_FAR_METERS = 200
const BLACK = 0x000000

/**
 * An aircraft seen from straight above, nose up, as a black shape on nothing: drawn once from its 3D model and kept.
 * The shape fills the picture, whatever the size of the aircraft.
 */
async function render(aircraftId: string): Promise<string> {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
  renderer.setPixelRatio(1)
  renderer.setSize(SILHOUETTE_PIXELS, SILHOUETTE_PIXELS, false)
  const scene = new THREE.Scene()
  const { manifest, buffer } = await loadModelData(aircraftId, aircraftId)
  const material = new THREE.MeshBasicMaterial({ color: BLACK })
  const aircraft = new THREE.Group()
  for (const part of manifest.parts) {
    aircraft.add(new THREE.Mesh(buildGeometry(part, buffer, false), material))
  }
  scene.add(aircraft)
  const box = new THREE.Box3().setFromObject(aircraft)
  const center = box.getCenter(new THREE.Vector3())
  const half = (Math.max(box.max.x - box.min.x, box.max.y - box.min.y) / 2) * FRAMING_MARGIN
  const camera = new THREE.OrthographicCamera(center.x - half, center.x + half, center.y + half, center.y - half, 0.1, CAMERA_FAR_METERS)
  camera.up.set(0, 1, 0)
  camera.position.set(center.x, center.y, CAMERA_HEIGHT_METERS)
  camera.lookAt(center.x, center.y, 0)
  renderer.render(scene, camera)
  const url = renderer.domElement.toDataURL('image/png')
  material.dispose()
  disposeScene(scene, renderer)
  return url
}

const silhouettes = new Map<string, Promise<string>>()

/** The silhouette of an aircraft of the game that has a 3D model, drawn the first time it is asked for. */
export function modelSilhouette(aircraftId: string): Promise<string> {
  let silhouette = silhouettes.get(aircraftId)
  if (silhouette === undefined) {
    silhouette = render(aircraftId)
    silhouettes.set(aircraftId, silhouette)
  }
  return silhouette
}

/** The picture from above of an aircraft of the game that has no 3D model, only a drawing. */
export function pictureUrlOf(drawing: string): string {
  return assetUrl(`sprites/bombers/${drawing}.png`)
}
