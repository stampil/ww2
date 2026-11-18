import * as THREE from 'three'
import { DamageEffects } from './DamageEffects'
import { loadStaticAircraft } from './StaticAircraft'

/** An enemy aircraft in the air, in meters: it takes damage level by level, trailing smoke and flames, and blows up when it is shot down. */
export type EnemyBody = {
  object: THREE.Object3D
  update(deltaSeconds: number): void
  damage(level: number): void
  destroy(): void
  setVelocity(velocity: THREE.Vector3): void
}

/** An enemy aircraft whose model does not move, with the wingspan measured on it. */
export type StaticEnemy = EnemyBody & { spanMeters: number }

/** An enemy is far or small on the screen, so it takes the small copies of the textures. */
export async function createStaticEnemy(aircraftId: string): Promise<StaticEnemy> {
  const meshes = await loadStaticAircraft(aircraftId, 'low')
  const effects = new DamageEffects()
  const root = new THREE.Group()
  root.add(meshes, effects.object)
  return {
    object: root,
    spanMeters: new THREE.Box3().setFromObject(meshes).getSize(new THREE.Vector3()).x,
    update: (deltaSeconds) => effects.update(deltaSeconds),
    damage: (level) => effects.setLevel(level),
    destroy: () => {
      effects.explode()
      meshes.visible = false
    },
    setVelocity: (velocity) => effects.setVelocity(velocity),
  }
}
