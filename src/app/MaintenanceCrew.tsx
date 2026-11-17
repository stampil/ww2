import { useEffect, useMemo, useRef, useState } from 'react'
import { assetUrl } from '../assetUrl'
import { findPath } from '../plans/pathfinding'
import type { PathStep } from '../plans/pathfinding'
import type { BuildingName, Cell, TerrainPlan } from '../plans/terrainPlan'

const MILLISECONDS_PER_COST = 350
const PERCENT = 100
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const SHEET_URL = assetUrl('sprites/crew/mechanic.png')
// The sheet has four rows of four frames: the walk toward the viewer, to the right, away from the viewer, and the repair on one knee.
const FRAME_ROWS = 4
const ROW_SHARE = PERCENT / (FRAME_ROWS - 1)
const WALK_ROWS = { down: 0, right: 1, up: 2 }
// The mechanic kneels left of the aircraft, a little below the middle of the stand, facing it as he looks to the right; his feet are the point that moves.
const WORK_OFFSET = { column: -0.45, row: 0.2 }
const FEET_OFFSET_ROWS = 0.35

type Pose = { row: number; isFlipped: boolean }
type Phase = 'out' | 'working' | 'back'

function buildingCell(plan: TerrainPlan, building: BuildingName): Cell {
  const sprite = plan.sprites.find((candidate) => candidate.building === building)!
  return { row: sprite.row, column: sprite.column }
}

/** The pose for walking from one point to the next: which row of the sheet, and whether it is the right-hand walk turned round. */
function walkingPose(from: { x: number; y: number }, to: { x: number; y: number }): Pose {
  const deltaX = to.x - from.x
  const deltaY = to.y - from.y
  if (Math.abs(deltaY) >= Math.abs(deltaX)) {
    return { row: deltaY >= 0 ? WALK_ROWS.down : WALK_ROWS.up, isFlipped: false }
  }
  return { row: WALK_ROWS.right, isFlipped: deltaX < 0 }
}

/** The points of the way from the workshop to the stand, in tiles from the north-west corner of the map, ending where the mechanic works. */
function wayPoints(steps: PathStep[], stand: Cell): { x: number; y: number; cost: number }[] {
  const points = steps.map((step) => ({ x: step.cell.column + 0.5, y: step.cell.row + 0.5 + FEET_OFFSET_ROWS, cost: step.cost }))
  const last = points[points.length - 1]
  const workX = stand.column + 0.5 + WORK_OFFSET.column
  const workY = stand.row + 0.5 + WORK_OFFSET.row + FEET_OFFSET_ROWS
  points.push({ x: workX, y: workY, cost: last.cost + Math.hypot(workX - last.x, workY - last.y) })
  return points
}

type Props = {
  plan: TerrainPlan
  /** The stand of the aircraft that is being inspected or repaired. */
  stand: Cell
  /** How long the mechanic waits before he sets off, so that two do not walk on top of each other. */
  delayMilliseconds: number
  /** True while the aircraft is inspected or repaired: the mechanic stays at it; once it is false he walks back to the workshop. */
  isWorking: boolean
  onGone: () => void
}

/**
 * A mechanic who runs from the workshop to an aircraft that is being inspected or repaired, works on it on one knee for as long as the server says,
 * then walks back to the workshop. He only shows the work, along the cheapest path of the terrain.
 */
function MaintenanceCrew({ plan, stand, delayMilliseconds, isWorking, onGone }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const isReduced = useMemo(() => window.matchMedia(REDUCED_MOTION_QUERY).matches, [])
  const [phase, setPhase] = useState<Phase>(isReduced ? 'working' : 'out')
  const isWorkingRef = useRef(isWorking)
  isWorkingRef.current = isWorking
  const onGoneRef = useRef(onGone)
  onGoneRef.current = onGone
  const way = useMemo(() => wayPoints(findPath(plan, buildingCell(plan, 'workshop'), stand), stand), [plan, stand])
  const rows = plan.tiles.length
  const columns = plan.tiles[0].length
  const work = way[way.length - 1]

  useEffect(() => {
    if (phase === 'working' && !isWorking) {
      setPhase('back')
    }
  }, [phase, isWorking])

  useEffect(() => {
    if (phase === 'working') {
      return
    }
    if (isReduced) {
      onGoneRef.current()
      return
    }
    const element = ref.current!
    const points = phase === 'out' ? way : [...way].reverse().map((point) => ({ ...point, cost: work.cost - point.cost }))
    const totalCost = points[points.length - 1].cost
    const offsets = points.map((point) => point.cost / totalCost)
    const timing = { duration: totalCost * MILLISECONDS_PER_COST, delay: phase === 'out' ? delayMilliseconds : 0, fill: 'both' as const }
    const poses: Pose[] = []
    for (let index = 0; index < points.length; index += 1) {
      const isLast = index === points.length - 1
      poses.push(walkingPose(isLast ? points[index - 1] : points[index], isLast ? points[index] : points[index + 1]))
    }
    const moving = element.animate(
      points.map((point, index) => ({ offset: offsets[index], left: `${(point.x / columns) * PERCENT}%`, top: `${(point.y / rows) * PERCENT}%` })),
      { ...timing, easing: 'linear' },
    )
    const turning = element.animate(
      poses.map((pose, index) => ({ offset: offsets[index], backgroundPositionY: `${pose.row * ROW_SHARE}%`, scale: pose.isFlipped ? '-1 1' : '1 1', easing: 'steps(1, end)' })),
      timing,
    )
    moving.onfinish = () => {
      if (phase === 'out') {
        setPhase(isWorkingRef.current ? 'working' : 'back')
      } else {
        onGoneRef.current()
      }
    }
    return () => {
      moving.cancel()
      turning.cancel()
    }
  }, [phase, way, work.cost, rows, columns, delayMilliseconds, isReduced])

  const start = phase === 'back' ? work : way[0]

  return (
    <span
      ref={ref}
      className="crew-member"
      data-pose={phase === 'working' ? 'work' : 'walk'}
      aria-hidden="true"
      style={{
        backgroundImage: `url(${SHEET_URL})`,
        left: `${((phase === 'working' ? work : start).x / columns) * PERCENT}%`,
        top: `${((phase === 'working' ? work : start).y / rows) * PERCENT}%`,
        backgroundPositionY: phase === 'working' ? `${3 * ROW_SHARE}%` : undefined,
        scale: '1 1',
      }}
    />
  )
}

export default MaintenanceCrew
