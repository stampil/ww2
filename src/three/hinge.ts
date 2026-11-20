import * as THREE from 'three'

/** A group that turns its parts around an axis through a pivot. */
export type Hinge = { group: THREE.Group; axis: THREE.Vector3 }

/** Puts the children in a hinge of the parent, so that turning the hinge turns them around the axis through the pivot, both in the frame of the parent. */
export function createHinge(parent: THREE.Object3D, children: THREE.Object3D[], pivot: THREE.Vector3, axis: THREE.Vector3): Hinge {
  const group = new THREE.Group()
  group.position.copy(pivot)
  children.forEach((child) => {
    child.removeFromParent()
    child.position.sub(pivot)
    group.add(child)
  })
  parent.add(group)
  return { group, axis: axis.clone().normalize() }
}

export function turnHinge(hinge: Hinge, radians: number): void {
  hinge.group.quaternion.setFromAxisAngle(hinge.axis, radians)
}
