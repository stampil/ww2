import { useEffect, useState } from 'react'
import { modelSilhouette, pictureUrlOf } from '../three/enemySilhouette'
import type { EnemyType } from './useBase'

// What each enemy is drawn from: the id of its 3D model, or the name of its drawing when it has no model.
const MODELS: Partial<Record<EnemyType, string>> = { bf109: 'bf109', vichyD520: 'd520', frenchD520: 'd520', he111: 'he111', ju87: 'ju87' }
const DRAWINGS: Partial<Record<EnemyType, string>> = { amiot143: 'amiot-143', leo451: 'leo-451' }

/** The silhouettes of these enemies, as pictures, once they are drawn; an enemy whose silhouette is not drawn yet has none. */
export function useEnemySilhouettes(enemies: EnemyType[]): Partial<Record<EnemyType, string>> {
  const [drawn, setDrawn] = useState<Partial<Record<EnemyType, string>>>({})
  const wanted = enemies.join(',')

  useEffect(() => {
    let isCurrent = true
    for (const enemy of wanted === '' ? [] : (wanted.split(',') as EnemyType[])) {
      const drawing = DRAWINGS[enemy]
      if (drawing !== undefined) {
        setDrawn((current) => ({ ...current, [enemy]: pictureUrlOf(drawing) }))
        continue
      }
      void modelSilhouette(MODELS[enemy]!)
        .then((url) => {
          if (isCurrent) {
            setDrawn((current) => ({ ...current, [enemy]: url }))
          }
        })
        .catch(() => undefined)
    }
    return () => {
      isCurrent = false
    }
  }, [wanted])

  return drawn
}
