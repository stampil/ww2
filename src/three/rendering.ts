import * as THREE from 'three'

const MIN_PIXEL_RATIO = 2
const MAX_PIXEL_RATIO = 3

/** A multisampled renderer drawn at least twice as large as the screen, so edges stay smooth on ordinary displays. */
export function createRenderer(container: HTMLElement, isTransparent: boolean): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: isTransparent })
  renderer.setPixelRatio(Math.min(Math.max(window.devicePixelRatio, MIN_PIXEL_RATIO), MAX_PIXEL_RATIO))
  container.appendChild(renderer.domElement)
  return renderer
}

export function fitToContainer(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera, container: HTMLElement): void {
  const { clientWidth, clientHeight } = container
  renderer.setSize(clientWidth, clientHeight, false)
  camera.aspect = clientWidth / clientHeight
  camera.updateProjectionMatrix()
}

function disposeMaterial(material: THREE.Material): void {
  Object.values(material).forEach((value) => {
    if (value instanceof THREE.Texture) {
      value.dispose()
    }
  })
  material.dispose()
}

/** Frees the geometries, materials and textures of a scene, then the renderer and its canvas. */
export function disposeScene(scene: THREE.Scene, renderer: THREE.WebGLRenderer): void {
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.geometry.dispose()
      const materials: THREE.Material[] = Array.isArray(object.material) ? object.material : [object.material]
      materials.forEach(disposeMaterial)
    }
    if (object instanceof THREE.Sprite) {
      disposeMaterial(object.material)
    }
  })
  renderer.dispose()
  renderer.domElement.remove()
}
