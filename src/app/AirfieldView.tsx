import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { Cell, TerrainPlan } from '../plans/terrainPlan'
import { AirfieldScene } from '../three/AirfieldScene'

/** An aircraft that has just been sent on a mission: it taxis from the stand it stood on to the runway, then takes off. */
export type Departure = { aircraftId: number; tailNumber: number; stand: Cell }
/** An aircraft that has just come back: it lands on the runway, with the damage it has, then taxis to its stand. */
export type Arrival = { aircraftId: number; tailNumber: number; stand: Cell; damageLevel: number }

type Props = {
  plan: TerrainPlan
  departures: Departure[]
  arrivals: Arrival[]
  /** The picture of an aircraft seen from above, as the flat map draws it, and its width there in tiles. */
  aircraftSprite: string
  aircraftWidthTiles: number
  /** The stands of the aircraft that stay on the ground. */
  parkedStands: Cell[]
  /** Called when an aircraft has flown off. */
  onDeparted: (aircraftId: number) => void
  /** Called when an aircraft has reached its stand. */
  onLanded: (aircraftId: number) => void
}

/** The base in 3D over its flat map, the same size, for the squadron to take off and land; it only shows it, the flights last as long as the server says. */
function AirfieldView({ plan, departures, arrivals, aircraftSprite, aircraftWidthTiles, parkedStands, onDeparted, onLanded }: Props) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<AirfieldScene | null>(null)
  const handedDepartureIds = useRef(new Set<number>())
  const handedArrivalIds = useRef(new Set<number>())
  const parkedKey = parkedStands.map((stand) => `${stand.row},${stand.column}`).join(' ')

  useEffect(() => {
    const scene = new AirfieldScene(
      containerRef.current!,
      plan,
      { aircraftSprite, aircraftWidthTiles },
      (aircraftId) => {
        handedDepartureIds.current.delete(aircraftId)
        onDeparted(aircraftId)
      },
      (aircraftId) => {
        handedArrivalIds.current.delete(aircraftId)
        onLanded(aircraftId)
      },
    )
    sceneRef.current = scene
    handedDepartureIds.current.clear()
    handedArrivalIds.current.clear()
    return () => {
      scene.dispose()
      sceneRef.current = null
    }
  }, [plan, aircraftSprite, aircraftWidthTiles, onDeparted, onLanded])

  useEffect(() => {
    sceneRef.current!.setParkedStands(parkedStands)
    // The stands are given again only when their content changes, not on every new array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parkedKey, plan, aircraftSprite, aircraftWidthTiles, onDeparted, onLanded])

  useEffect(() => {
    for (const departure of departures) {
      if (!handedDepartureIds.current.has(departure.aircraftId)) {
        handedDepartureIds.current.add(departure.aircraftId)
        sceneRef.current!.depart(departure.aircraftId, departure.stand, departure.tailNumber)
      }
    }
    for (const arrival of arrivals) {
      if (!handedArrivalIds.current.has(arrival.aircraftId)) {
        handedArrivalIds.current.add(arrival.aircraftId)
        sceneRef.current!.land(arrival.aircraftId, arrival.stand, arrival.damageLevel, arrival.tailNumber)
      }
    }
  }, [departures, arrivals, plan, aircraftSprite, aircraftWidthTiles, onDeparted, onLanded])

  return <div className="airfield-view" role="img" aria-label={t('base.airfield')} ref={containerRef} />
}

export default AirfieldView
