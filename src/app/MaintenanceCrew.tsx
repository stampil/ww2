import { useEffect, useMemo, useRef } from 'react'
import { findPath } from '../plans/pathfinding'
import type { BuildingName, TerrainPlan } from '../plans/terrainPlan'

const MILLISECONDS_PER_COST = 350
const PERCENT = 100
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function buildingCell(plan: TerrainPlan, building: BuildingName): { row: number; column: number } {
  const sprite = plan.sprites.find((candidate) => candidate.building === building)!
  return { row: sprite.row, column: sprite.column }
}

type Props = {
  plan: TerrainPlan
  /** How long the crew waits before it sets off, so that two crews do not walk on top of each other. */
  delayMilliseconds: number
}

/**
 * A mechanic on the way between the workshop and the hangar, there and back, along the cheapest path of the terrain.
 * It only shows the work: the repair lasts as long as the server says. A dot stands for the mechanic until there is a sprite.
 */
function MaintenanceCrew({ plan, delayMilliseconds }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const steps = useMemo(() => findPath(plan, buildingCell(plan, 'workshop'), buildingCell(plan, 'hangar')), [plan])
  const rows = plan.tiles.length
  const columns = plan.tiles[0].length

  useEffect(() => {
    if (steps.length === 0 || window.matchMedia(REDUCED_MOTION_QUERY).matches) {
      return
    }
    const totalCost = steps[steps.length - 1].cost
    const keyframes = steps.map((step) => ({
      offset: step.cost / totalCost,
      left: `${((step.cell.column + 0.5) / columns) * PERCENT}%`,
      top: `${((step.cell.row + 0.5) / rows) * PERCENT}%`,
    }))
    const animation = ref.current!.animate(keyframes, {
      duration: totalCost * MILLISECONDS_PER_COST,
      delay: delayMilliseconds,
      fill: 'backwards',
      easing: 'linear',
      iterations: Infinity,
      direction: 'alternate',
    })
    return () => animation.cancel()
  }, [steps, rows, columns, delayMilliseconds])

  if (steps.length === 0) {
    return null
  }
  const first = steps[0].cell

  return (
    <span
      ref={ref}
      className="maintenance-crew"
      aria-hidden="true"
      style={{ left: `${((first.column + 0.5) / columns) * PERCENT}%`, top: `${((first.row + 0.5) / rows) * PERCENT}%` }}
    />
  )
}

export default MaintenanceCrew
