import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AIRCRAFT_CONTROLS } from '../three/D520Model'
import { damageStage, DESTROYED_LEVEL } from '../three/damageStages'
import type { AircraftControl } from '../three/D520Model'
import { ModelViewerScene } from '../three/ModelViewerScene'
import type { Livery } from '../three/liveries'
import ControlButtons from './ControlButtons'
import LiverySwitch from './LiverySwitch'
import { useToggledControls } from './useToggledControls'

const INITIAL_CONTROLS: AircraftControl[] = ['runEngine']

function AircraftViewer() {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<ModelViewerScene | null>(null)
  const [livery, setLivery] = useState<Livery>('french')
  const [damageLevel, setDamageLevel] = useState(0)
  const { activeControls, toggle } = useToggledControls(INITIAL_CONTROLS, (control, isActive) =>
    sceneRef.current?.setControl(control, isActive),
  )

  useEffect(() => {
    const scene = new ModelViewerScene(containerRef.current!)
    INITIAL_CONTROLS.forEach((control) => scene.setControl(control, true))
    sceneRef.current = scene
    return () => {
      scene.dispose()
      sceneRef.current = null
    }
  }, [])

  useEffect(() => {
    sceneRef.current?.setLivery(livery)
  }, [livery])

  function inflictDamage(): void {
    setDamageLevel(sceneRef.current?.inflictDamage() ?? damageLevel)
  }

  function repair(): void {
    sceneRef.current?.repair()
    setDamageLevel(0)
  }

  return (
    <section className="model-viewer" aria-label={t('viewer.title')}>
      <div className="model-viewer-canvas" ref={containerRef} />
      <p className="model-viewer-hint">{t('viewer.hint')}</p>
      <LiverySwitch livery={livery} onChange={setLivery} />
      <ControlButtons controls={AIRCRAFT_CONTROLS} activeControls={activeControls} onToggle={toggle} />
      <div className="control-buttons" role="group" aria-label={t('damage.label')}>
        <button type="button" disabled={damageLevel >= DESTROYED_LEVEL} onClick={inflictDamage}>
          {t('damage.inflict')}
        </button>
        <button type="button" disabled={damageLevel === 0} onClick={repair}>
          {t('damage.repair')}
        </button>
      </div>
      <p className="model-viewer-hint">
        {t('damage.status', { stage: t(`damage.stage.${damageStage(damageLevel)}`), level: damageLevel, max: DESTROYED_LEVEL })}
      </p>
    </section>
  )
}

export default AircraftViewer
