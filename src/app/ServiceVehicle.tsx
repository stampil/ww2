import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { assetUrl } from '../assetUrl'
import { findPath } from '../plans/pathfinding'
import type { PathStep } from '../plans/pathfinding'
import type { BuildingName, Cell, TerrainPlan } from '../plans/terrainPlan'
import Firefighters from './Firefighters'

const MILLISECONDS_PER_COST = 220
const PERCENT = 100
const QUARTER_TURN_DEGREES = 90
const FULL_TURN_DEGREES = 360
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
// The vehicle stops beside the aircraft, to its right and a little below the middle of the stand.
const STOP_OFFSET = { column: 0.95, row: 0.3 }

export type ServiceVehicleKind = 'fuel-truck' | 'fire-engine'
type Phase = 'out' | 'staying' | 'back'
type Point = { x: number; y: number; cost: number }

function buildingCell(plan: TerrainPlan, building: BuildingName): Cell {
  const sprite = plan.sprites.find((candidate) => candidate.building === building)!
  return { row: sprite.row, column: sprite.column }
}

/** The points of the way from the depot to the stand, in tiles from the north-west corner of the map, ending where the vehicle stops. */
function wayPoints(steps: PathStep[], stand: Cell): Point[] {
  const points = steps.map((step) => ({ x: step.cell.column + 0.5, y: step.cell.row + 0.5, cost: step.cost }))
  const last = points[points.length - 1]
  const stopX = stand.column + 0.5 + STOP_OFFSET.column
  const stopY = stand.row + 0.5 + STOP_OFFSET.row
  points.push({ x: stopX, y: stopY, cost: last.cost + Math.hypot(stopX - last.x, stopY - last.y) })
  return points
}

/** The angle, clockwise from straight up, of the way from one point to the next: the sprites are drawn with the cab at the top. */
function headingBetween(from: Point, to: Point): number {
  const degrees = (Math.atan2(to.x - from.x, from.y - to.y) * 180) / Math.PI

  return Math.round(degrees / QUARTER_TURN_DEGREES) * QUARTER_TURN_DEGREES
}

type Props = {
  plan: TerrainPlan
  kind: ServiceVehicleKind
  /** The building the vehicle sets off from, and comes back to. */
  depot: BuildingName
  /** The stand of the aircraft it goes to. */
  stand: Cell
  /** How long it is on the way, in tiles, from end to end: its picture is that long on the map. */
  lengthTiles: number
  /** How long the vehicle waits before it sets off, so that two do not drive on top of each other. */
  delayMilliseconds: number
  /** How long it stays at the aircraft, when that is a fixed time; otherwise it stays while `isStaying` is true. */
  stayMilliseconds?: number
  isStaying: boolean
  /** Whether firefighters get off it and fight the fire while `isStaying`; the vehicle leaves once they are back on. */
  hasFirefighters?: boolean
  onGone: () => void
}

/**
 * A vehicle of the base that drives from its depot to an aircraft along the cheapest path of the terrain, stays there, then drives back: the fire engine to an aircraft
 * that burns, the fuel truck to one that has landed. It only shows the work; the times are the server's.
 */
function ServiceVehicle({ plan, kind, depot, stand, lengthTiles, delayMilliseconds, stayMilliseconds, isStaying, hasFirefighters = false, onGone }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const isReduced = useMemo(() => window.matchMedia(REDUCED_MOTION_QUERY).matches, [])
  const [phase, setPhase] = useState<Phase>('out')
  const onGoneRef = useRef(onGone)
  onGoneRef.current = onGone
  const way = useMemo(() => wayPoints(findPath(plan, buildingCell(plan, depot), stand), stand), [plan, depot, stand])
  const rows = plan.tiles.length
  const columns = plan.tiles[0].length
  const stop = way[way.length - 1]

  useEffect(() => {
    if (isReduced) {
      onGoneRef.current()
    }
  }, [isReduced])

  useEffect(() => {
    if (phase !== 'staying' || hasFirefighters) {
      return
    }
    if (stayMilliseconds === undefined) {
      if (!isStaying) {
        setPhase('back')
      }
      return
    }
    const timer = setTimeout(() => setPhase('back'), stayMilliseconds)
    return () => clearTimeout(timer)
  }, [phase, isStaying, stayMilliseconds, hasFirefighters])

  useEffect(() => {
    if (phase === 'staying' || isReduced) {
      return
    }
    const element = ref.current!
    const points = phase === 'out' ? way : [...way].reverse().map((point) => ({ ...point, cost: stop.cost - point.cost }))
    const totalCost = points[points.length - 1].cost
    const timing = { duration: totalCost * MILLISECONDS_PER_COST, delay: phase === 'out' ? delayMilliseconds : 0, fill: 'both' as const }
    const headings: number[] = []
    for (let index = 0; index < points.length; index += 1) {
      const isLast = index === points.length - 1
      headings.push(isLast ? headings[index - 1] : headingBetween(points[index], points[index + 1]))
    }
    const moving = element.animate(
      points.map((point) => ({ offset: point.cost / totalCost, left: `${(point.x / columns) * PERCENT}%`, top: `${(point.y / rows) * PERCENT}%` })),
      { ...timing, easing: 'linear' },
    )
    const turning = element.animate(
      points.map((point, index) => ({ offset: point.cost / totalCost, rotate: `${(headings[index] + FULL_TURN_DEGREES) % FULL_TURN_DEGREES}deg`, easing: 'steps(1, end)' })),
      timing,
    )
    moving.onfinish = () => {
      if (phase === 'out') {
        setPhase('staying')
      } else {
        onGoneRef.current()
      }
    }
    return () => {
      moving.cancel()
      turning.cancel()
    }
  }, [phase, way, stop.cost, rows, columns, delayMilliseconds, isReduced])

  if (isReduced) {
    return null
  }
  const shown = phase === 'out' ? way[0] : stop

  return (
    <>
      <span
        ref={ref}
        className="service-vehicle"
        data-kind={kind}
        aria-hidden="true"
        style={
          {
            '--length': lengthTiles,
            backgroundImage: `url(${assetUrl(`sprites/vehicles/${kind}.png`)})`,
            left: `${(shown.x / columns) * PERCENT}%`,
            top: `${(shown.y / rows) * PERCENT}%`,
          } as CSSProperties
        }
      />
      {phase === 'staying' && hasFirefighters && <Firefighters plan={plan} stand={stand} engine={stop} isFighting={isStaying} onBack={() => setPhase('back')} />}
    </>
  )
}

export default ServiceVehicle
