import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const BUSH_URL = '/models/bush/shrub_04_1k.gltf'
const GLTF_TO_WORLD_RADIANS = Math.PI / 2
const WORLD_UP = new THREE.Vector3(0, 0, 1)

/** Where a bush stands on the ground, how wide it is and how it is turned about the vertical. */
export type BushPlacement = { x: number; y: number; widthMeters: number; turnRadians: number }

/** The 3D bushes: the Poly Haven shrub_04 (CC0), drawn once for every placement. Shown once loaded. */
export class Bushes {
  readonly object = new THREE.Group()

  constructor(private readonly placements: BushPlacement[]) {
    void this.load()
  }

  private async load(): Promise<void> {
    const gltf = await new GLTFLoader().loadAsync(BUSH_URL)
    gltf.scene.updateMatrixWorld(true)
    gltf.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        this.object.add(this.instance(child))
      }
    })
  }

  /** The shrub stood up (glTF up is y, ours is z), its foot on the ground at the origin, repeated at every placement. */
  private instance(mesh: THREE.Mesh): THREE.InstancedMesh {
    const geometry = mesh.geometry.clone()
    geometry.applyMatrix4(mesh.matrixWorld)
    geometry.rotateX(GLTF_TO_WORLD_RADIANS)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    geometry.translate(-(box.min.x + box.max.x) / 2, -(box.min.y + box.max.y) / 2, -box.min.z)
    const widthMeters = Math.max(box.max.x - box.min.x, box.max.y - box.min.y)

    const bushes = new THREE.InstancedMesh(geometry, mesh.material, this.placements.length)
    const rotation = new THREE.Quaternion()
    this.placements.forEach((placement, index) => {
      const scale = placement.widthMeters / widthMeters
      rotation.setFromAxisAngle(WORLD_UP, placement.turnRadians)
      bushes.setMatrixAt(
        index,
        new THREE.Matrix4().compose(new THREE.Vector3(placement.x, placement.y, 0), rotation, new THREE.Vector3(scale, scale, scale)),
      )
    })
    return bushes
  }
}
