import * as THREE from 'three'

const MODELS_URL = '/models/d520/'
const SURFACE_ROUGHNESS = 0.8

type PartGroup = { material: number; start: number; count: number }
type PartEntry = {
  name: string
  origin: [number, number, number]
  vertexCount: number
  indexCount: number
  positionsOffset: number
  normalsOffset: number
  uvsOffset: number
  indicesOffset: number
  groups: PartGroup[]
}
type MaterialEntry = { name: string; opacity: number; texture: string | null }
export type Manifest = { materials: MaterialEntry[]; parts: PartEntry[] }
export type ModelData = { manifest: Manifest; buffer: ArrayBuffer }

/** The manifest and the binary buffer that tools/convert-ac3d.py wrote for one model. */
export async function loadModelData(name: string): Promise<ModelData> {
  const [manifest, buffer] = await Promise.all([
    fetch(`${MODELS_URL}${name}.json`).then((response) => response.json() as Promise<Manifest>),
    fetch(`${MODELS_URL}${name}.bin`).then((response) => response.arrayBuffer()),
  ])
  return { manifest, buffer }
}

export function buildGeometry(part: PartEntry, buffer: ArrayBuffer, withGroups: boolean): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(buffer, part.positionsOffset, part.vertexCount * 3), 3))
  geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(buffer, part.normalsOffset, part.vertexCount * 3), 3))
  geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(buffer, part.uvsOffset, part.vertexCount * 2), 2))
  geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(buffer, part.indicesOffset, part.indexCount), 1))
  if (withGroups) {
    part.groups.forEach((group) => geometry.addGroup(group.start, group.count, group.material))
  }
  return geometry
}

/** One two-sided material per manifest material; the translucent ones do not write depth. */
export function buildMaterials(manifest: Manifest): THREE.MeshStandardMaterial[] {
  return manifest.materials.map(
    (material) =>
      new THREE.MeshStandardMaterial({
        roughness: SURFACE_ROUGHNESS,
        side: THREE.DoubleSide,
        transparent: material.opacity < 1,
        opacity: material.opacity,
        depthWrite: material.opacity >= 1,
      }),
  )
}
