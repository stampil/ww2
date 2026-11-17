import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { COCKPIT_CONTROLS } from '../three/CockpitModel'
import type { CockpitControl } from '../three/CockpitModel'
import { CockpitViewerScene } from '../three/CockpitViewerScene'
import ControlButtons from './ControlButtons'
import { useToggledControls } from './useToggledControls'

const INITIAL_CONTROLS: CockpitControl[] = []

function CockpitViewer() {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<CockpitViewerScene | null>(null)
  const { activeControls, toggle } = useToggledControls(INITIAL_CONTROLS, (control, isActive) =>
    sceneRef.current?.setControl(control, isActive),
  )

  useEffect(() => {
    const scene = new CockpitViewerScene(containerRef.current!)
    sceneRef.current = scene
    return () => {
      scene.dispose()
      sceneRef.current = null
    }
  }, [])

  return (
    <section className="model-viewer" aria-label={t('cockpit.title')}>
      <div className="model-viewer-canvas" ref={containerRef} />
      <p className="model-viewer-hint">{t('cockpit.hint')}</p>
      <ControlButtons controls={COCKPIT_CONTROLS} activeControls={activeControls} onToggle={toggle} />
    </section>
  )
}

export default CockpitViewer
