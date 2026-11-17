import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TakeoffScene } from '../three/TakeoffScene'
import type { Livery } from '../three/liveries'
import LiverySwitch from './LiverySwitch'

function TakeoffView() {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<TakeoffScene | null>(null)
  const [livery, setLivery] = useState<Livery>('french')

  useEffect(() => {
    const scene = new TakeoffScene(containerRef.current!)
    sceneRef.current = scene
    return () => {
      scene.dispose()
      sceneRef.current = null
    }
  }, [])

  useEffect(() => {
    sceneRef.current?.setLivery(livery)
  }, [livery])

  return (
    <section className="takeoff" aria-label={t('takeoff.title')}>
      <div className="takeoff-canvas" ref={containerRef} />
      <LiverySwitch livery={livery} onChange={setLivery} />
    </section>
  )
}

export default TakeoffView
