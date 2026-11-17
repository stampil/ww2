import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ModelViewerScene } from '../three/ModelViewerScene'
import type { Livery } from '../three/liveries'
import LiverySwitch from './LiverySwitch'

function AircraftViewer() {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<ModelViewerScene | null>(null)
  const [livery, setLivery] = useState<Livery>('french')

  useEffect(() => {
    const scene = new ModelViewerScene(containerRef.current!)
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
    <section className="aircraft-viewer" aria-label={t('viewer.title')}>
      <div className="aircraft-viewer-canvas" ref={containerRef} />
      <p className="aircraft-viewer-hint">{t('viewer.hint')}</p>
      <LiverySwitch livery={livery} onChange={setLivery} />
    </section>
  )
}

export default AircraftViewer
