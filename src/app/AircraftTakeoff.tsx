import { useEffect, useMemo, useRef } from 'react'
import type { CSSProperties } from 'react'
import { takeoffRoute } from '../plans/takeoffRoute'
import type { Cell, TerrainPlan } from '../plans/terrainPlan'
import { takeoffAnimation } from './takeoffMotion'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

type Props = {
  plan: TerrainPlan
  aircraftId: number
  stand: Cell
  sprite: string
  /** How long the aircraft waits on its stand before it sets off, so that a squadron leaves one after the other. */
  delayMilliseconds: number
  /** The width of the picture, in tiles. */
  widthTiles: number
  onDeparted: (aircraftId: number) => void
}

/**
 * An aircraft that rolls from its stand to the runway and takes off, then leaves the map. It only shows the departure:
 * the flight lasts as long as the server says. It waits on its stand until its turn.
 */
function AircraftTakeoff({ plan, aircraftId, stand, sprite, delayMilliseconds, widthTiles, onDeparted }: Props) {
  const ref = useRef<HTMLImageElement>(null)
  const rows = plan.tiles.length
  const columns = plan.tiles[0].length
  const flight = useMemo(() => takeoffAnimation(takeoffRoute(plan, stand), columns, rows), [plan, stand, columns, rows])

  useEffect(() => {
    if (window.matchMedia(REDUCED_MOTION_QUERY).matches) {
      onDeparted(aircraftId)
      return
    }
    const animation = ref.current!.animate(flight.keyframes, {
      duration: flight.durationMilliseconds,
      delay: delayMilliseconds,
      fill: 'both',
      easing: 'linear',
    })
    animation.onfinish = () => onDeparted(aircraftId)
    return () => animation.cancel()
  }, [flight, delayMilliseconds, aircraftId, onDeparted])

  return (
    <img
      ref={ref}
      className="aircraft-takeoff"
      src={sprite}
      alt=""
      aria-hidden="true"
      draggable={false}
      style={{ '--row': stand.row, '--column': stand.column, '--width': widthTiles } as CSSProperties}
    />
  )
}

export default AircraftTakeoff
