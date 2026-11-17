import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { BushViewerScene } from '../three/BushViewerScene'

function BushViewer() {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const scene = new BushViewerScene(containerRef.current!)
    return () => scene.dispose()
  }, [])

  return (
    <section className="model-viewer" aria-label={t('bush.title')}>
      <div className="model-viewer-canvas" ref={containerRef} />
      <p className="model-viewer-hint">{t('bush.hint')}</p>
    </section>
  )
}

export default BushViewer
