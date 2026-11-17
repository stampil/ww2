import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { DogfightScene } from '../three/DogfightScene'
import type { DuelView } from '../three/DogfightScene'

type Props = {
  arenaSize: number
  /** Where both aircraft stand; nothing is drawn of them until the dogfight has begun. */
  view: DuelView | null
}

/** The dogfight seen from above, in 3D. It owns a WebGL scene, freed when the window goes. */
function DogfightView({ arenaSize, view }: Props) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<DogfightScene | null>(null)

  useEffect(() => {
    const scene = new DogfightScene(containerRef.current!, arenaSize)
    sceneRef.current = scene
    return () => {
      scene.dispose()
      sceneRef.current = null
    }
  }, [arenaSize])

  useEffect(() => {
    if (view !== null) {
      sceneRef.current!.setView(view)
    }
  }, [view, arenaSize])

  return <div className="duel-view" role="img" aria-label={t('duel.title')} ref={containerRef} />
}

export default DogfightView
