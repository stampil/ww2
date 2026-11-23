import * as THREE from 'three'
import { assetUrl } from '../assetUrl'
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

// A flat picture sits this far under the smoke and the flames, which are drawn over it.
const PICTURE_DROP_METERS = 0.5

function enemyOf(meshes: THREE.Object3D): StaticEnemy {
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

/** An enemy is far or small on the screen, so it takes the small copies of the textures. */
export async function createStaticEnemy(aircraftId: string): Promise<StaticEnemy> {
  return enemyOf(await loadStaticAircraft(aircraftId, 'low'))
}

/** An enemy that is a picture of the aircraft seen from above, nose up, as wide as its wingspan: the camera of the duel looks straight down at it. */
export async function createPictureEnemy(pictureUrl: string, spanMeters: number): Promise<StaticEnemy> {
  const texture = await new THREE.TextureLoader().loadAsync(assetUrl(pictureUrl))
  texture.colorSpace = THREE.SRGBColorSpace
  const image = texture.image as HTMLImageElement
  const picture = new THREE.Mesh(new THREE.PlaneGeometry(spanMeters, (spanMeters * image.height) / image.width), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }))
  picture.position.z = -PICTURE_DROP_METERS
  return enemyOf(picture)
}
