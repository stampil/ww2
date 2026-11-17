import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { Cell, TerrainPlan } from '../plans/terrainPlan'
import { DepartureScene } from '../three/DepartureScene'

/** An aircraft that has just been sent on a mission: it taxis from the stand it stood on to the runway, then takes off. */
export type Departure = { aircraftId: number; stand: Cell }

type Props = {
  plan: TerrainPlan
  departures: Departure[]
  /** The picture of an aircraft seen from above, as the flat map draws it, and its width there in tiles. */
  aircraftSprite: string
  aircraftWidthTiles: number
  /** The stands of the aircraft that stay on the ground. */
  parkedStands: Cell[]
  /** Called when an aircraft has flown off. */
  onDeparted: (aircraftId: number) => void
}

/** The base in 3D over its flat map, the same size, for the squadron to take off; it only shows the departure, the flight lasts as long as the server says. */
function DepartureView({ plan, departures, aircraftSprite, aircraftWidthTiles, parkedStands, onDeparted }: Props) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<DepartureScene | null>(null)
  const handedIds = useRef(new Set<number>())
  const parkedKey = parkedStands.map((stand) => `${stand.row},${stand.column}`).join(' ')

  useEffect(() => {
    const scene = new DepartureScene(containerRef.current!, plan, { aircraftSprite, aircraftWidthTiles }, (aircraftId) => {
      handedIds.current.delete(aircraftId)
      onDeparted(aircraftId)
    })
    sceneRef.current = scene
    handedIds.current.clear()
    return () => {
      scene.dispose()
      sceneRef.current = null
    }
  }, [plan, aircraftSprite, aircraftWidthTiles, onDeparted])

  useEffect(() => {
    sceneRef.current!.setParkedStands(parkedStands)
    // The stands are given again only when their content changes, not on every new array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parkedKey, plan, aircraftSprite, aircraftWidthTiles, onDeparted])

  useEffect(() => {
    for (const departure of departures) {
      if (!handedIds.current.has(departure.aircraftId)) {
        handedIds.current.add(departure.aircraftId)
        sceneRef.current!.depart(departure.aircraftId, departure.stand)
      }
    }
  }, [departures, plan, aircraftSprite, aircraftWidthTiles, onDeparted])

  return <div className="departure-view" role="img" aria-label={t('base.departure')} ref={containerRef} />
}

export default DepartureView
