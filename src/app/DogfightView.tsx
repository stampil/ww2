import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { DogfightScene } from '../three/DogfightScene'
import type { DuelBomber, DuelView } from '../three/DogfightScene'
import type { Livery } from '../three/liveries'

type Props = {
  arenaSize: number
  bomber: DuelBomber
  /** The livery of the aircraft the player flies. */
  livery: Livery
  /** Where both aircraft stand; nothing is drawn of them until the dogfight has begun. */
  view: DuelView | null
}

/** The dogfight seen from above, in 3D. It owns a WebGL scene, freed when the window goes. */
function DogfightView({ arenaSize, bomber, livery, view }: Props) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<DogfightScene | null>(null)

  useEffect(() => {
    const scene = new DogfightScene(containerRef.current!, arenaSize, bomber, livery)
    sceneRef.current = scene
    return () => {
      scene.dispose()
      sceneRef.current = null
    }
  }, [arenaSize, bomber, livery])

  useEffect(() => {
    if (view !== null) {
      sceneRef.current!.setView(view)
    }
  }, [view, arenaSize])

  return <div className="duel-view" role="img" aria-label={t('duel.title')} ref={containerRef} />
}

export default DogfightView
