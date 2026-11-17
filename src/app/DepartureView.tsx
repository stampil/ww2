import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { Cell, TerrainPlan } from '../plans/terrainPlan'
import { DepartureScene } from '../three/DepartureScene'

/** An aircraft that has just been sent on a mission: it taxis from the stand it stood on to the start of the runway, then takes off. */
export type Departure = { aircraftId: number; stand: Cell }

type Props = {
  plan: TerrainPlan
  departures: Departure[]
  /** Called when an aircraft has flown off the view. */
  onDeparted: (aircraftId: number) => void
}

/** The squadron taking off, in 3D, over a corner of the map; it only shows the departure, the flight lasts as long as the server says. */
function DepartureView({ plan, departures, onDeparted }: Props) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<DepartureScene | null>(null)
  const handedIds = useRef(new Set<number>())

  useEffect(() => {
    const scene = new DepartureScene(containerRef.current!, plan, (aircraftId) => {
      handedIds.current.delete(aircraftId)
      onDeparted(aircraftId)
    })
    sceneRef.current = scene
    handedIds.current.clear()
    return () => {
      scene.dispose()
      sceneRef.current = null
    }
  }, [plan, onDeparted])

  useEffect(() => {
    for (const departure of departures) {
      if (!handedIds.current.has(departure.aircraftId)) {
        handedIds.current.add(departure.aircraftId)
        sceneRef.current!.depart(departure.aircraftId, departure.stand)
      }
    }
  }, [departures, plan, onDeparted])

  return <div className="departure-view" role="img" aria-label={t('base.departure')} ref={containerRef} />
}

export default DepartureView
