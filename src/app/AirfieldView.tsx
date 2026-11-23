import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { effects } from '../audio/SoundEffects'
import type { SoundName } from '../audio/SoundEffects'
import type { Cell, TerrainPlan } from '../plans/terrainPlan'
import { AirfieldScene } from '../three/AirfieldScene'
import type { ParkedPlace } from '../three/AirfieldScene'
import type { Livery } from '../three/liveries'

// Aircraft that start within this long of each other are one group, which has one sound.
const SAME_GROUP_MILLISECONDS = 8000

/** An aircraft that has just been sent on a mission: it taxis from the stand it stood on to the runway, then takes off. */
export type Departure = { aircraftId: number; tailNumber: number; stand: Cell; livery: Livery }
/** An aircraft that a stand has just freed room for: it comes out of the hangar, with the damage it has, and taxis to the stand. */
export type Emergence = { aircraftId: number; tailNumber: number; stand: Cell; damageLevel: number; livery: Livery }
/** An aircraft that has just come back: it lands on the runway, with the damage it has, then taxis to its stand. */
export type Arrival = { aircraftId: number; tailNumber: number; stand: Cell; damageLevel: number; livery: Livery }

type Props = {
  plan: TerrainPlan
  departures: Departure[]
  arrivals: Arrival[]
  emergences: Emergence[]
  /** How wide an aircraft is on the map, in tiles. */
  aircraftWidthTiles: number
  /** The aircraft that stay on the ground: where each stands and the livery it wears. */
  parked: ParkedPlace[]
  /** The buildings that a raid destroyed, by the name of their sprite. */
  ruins: string[]
  /** The picture of the aircraft seen from above, which its shadow is made of. */
  shadowImage: string
  /** Called when an aircraft has flown off. */
  onDeparted: (aircraftId: number) => void
  /** Called when an aircraft has reached its stand. */
  onLanded: (aircraftId: number) => void
  /** Called when the camera leaves the view from above the base, and when it is back. */
  onCameraAway: (isAway: boolean) => void
  /** Called with the CSS transform that lays the flat map on the ground the camera sees from above the base, and with nothing when the view is gone. */
  onFramed: (groundTransform: string) => void
}

/** The base in 3D over its flat map, the same size, with the aircraft parked and the squadron taking off and landing; it only shows it, the flights last as long as the server says. */
function AirfieldView({ plan, departures, arrivals, emergences, aircraftWidthTiles, parked, ruins, shadowImage, onDeparted, onLanded, onCameraAway, onFramed }: Props) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<AirfieldScene | null>(null)
  const handedDepartureIds = useRef(new Set<number>())
  const handedArrivalIds = useRef(new Set<number>())
  const handedEmergenceIds = useRef(new Set<number>())
  const lastSoundMilliseconds = useRef(Number.NEGATIVE_INFINITY)
  const parkedKey = parked.map((place) => `${place.stand.row},${place.stand.column},${place.livery}`).join(' ')

  /** One sound for a whole group of aircraft that take off or land together, not one for each. */
  function playOnce(name: SoundName): void {
    if (performance.now() - lastSoundMilliseconds.current > SAME_GROUP_MILLISECONDS) {
      effects.play(name)
    }
    lastSoundMilliseconds.current = performance.now()
  }

  useEffect(() => {
    const scene = new AirfieldScene(
      containerRef.current!,
      plan,
      { aircraftWidthTiles, shadowImage },
      (aircraftId) => {
        handedDepartureIds.current.delete(aircraftId)
        onDeparted(aircraftId)
      },
      (aircraftId) => {
        handedArrivalIds.current.delete(aircraftId)
        handedEmergenceIds.current.delete(aircraftId)
        onLanded(aircraftId)
      },
      onCameraAway,
      onFramed,
    )
    sceneRef.current = scene
    handedDepartureIds.current.clear()
    handedArrivalIds.current.clear()
    handedEmergenceIds.current.clear()
    return () => {
      scene.dispose()
      sceneRef.current = null
      onCameraAway(false)
      onFramed('')
    }
  }, [plan, aircraftWidthTiles, shadowImage, onDeparted, onLanded, onCameraAway, onFramed])

  const ruinsKey = ruins.join(' ')

  useEffect(() => {
    sceneRef.current!.setRuins(ruins)
    // The ruins are given again only when the buildings change, not on every new array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruinsKey, plan, aircraftWidthTiles, shadowImage, onDeparted, onLanded, onCameraAway, onFramed])

  useEffect(() => {
    sceneRef.current!.setParked(parked)
    // The aircraft on the ground are given again only when their content changes, not on every new array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parkedKey, plan, aircraftWidthTiles, onDeparted, onLanded])

  useEffect(() => {
    for (const departure of departures) {
      if (!handedDepartureIds.current.has(departure.aircraftId)) {
        handedDepartureIds.current.add(departure.aircraftId)
        playOnce('takeoff')
        sceneRef.current!.depart(departure.aircraftId, departure.stand, departure.tailNumber, departure.livery)
      }
    }
    for (const arrival of arrivals) {
      if (!handedArrivalIds.current.has(arrival.aircraftId)) {
        handedArrivalIds.current.add(arrival.aircraftId)
        playOnce('landing')
        sceneRef.current!.land(arrival.aircraftId, arrival.stand, arrival.damageLevel, arrival.tailNumber, arrival.livery)
      }
    }
    for (const emergence of emergences) {
      if (!handedEmergenceIds.current.has(emergence.aircraftId)) {
        handedEmergenceIds.current.add(emergence.aircraftId)
        sceneRef.current!.emerge(emergence.aircraftId, emergence.stand, emergence.damageLevel, emergence.tailNumber, emergence.livery)
      }
    }
  }, [departures, arrivals, emergences, plan, aircraftWidthTiles, onDeparted, onLanded])

  return <div className="airfield-view" role="img" aria-label={t('base.airfield')} ref={containerRef} />
}

export default AirfieldView
