import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { AircraftShowcaseScene } from '../three/AircraftShowcaseScene'

// The model, about 1.8 MB, is only loaded when its picture is about to come into view.
const PRELOAD_MARGIN = '300px'

/** One aircraft of the game in 3D, turned by dragging, with its name and role; the texts are those of `showcase.<aircraftId>`. */
function AircraftShowcase({ aircraftId }: { aircraftId: string }) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current!
    let scene: AircraftShowcaseScene | undefined
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && scene === undefined) {
            scene = new AircraftShowcaseScene(container, aircraftId)
            observer.disconnect()
          }
        }
      },
      { rootMargin: PRELOAD_MARGIN },
    )
    observer.observe(container)
    return () => {
      observer.disconnect()
      scene?.dispose()
    }
  }, [aircraftId])

  return (
    <section className="model-viewer" aria-label={t(`showcase.${aircraftId}.name`)}>
      <div className="model-viewer-canvas" ref={containerRef} />
      <h3 className="model-viewer-title">{t(`showcase.${aircraftId}.name`)}</h3>
      <p className="model-viewer-hint">
        {t(`showcase.${aircraftId}.role`)} — {t('showcase.hint')}
      </p>
    </section>
  )
}

export default AircraftShowcase
