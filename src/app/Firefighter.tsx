import { useEffect, useMemo, useRef, useState } from 'react'
import { assetUrl } from '../assetUrl'
import type { TerrainPlan } from '../plans/terrainPlan'
import { ROW_SHARE, WORK_ROW, walkingPose } from './crewPose'
import type { CrewPose } from './crewPose'

const MILLISECONDS_PER_TILE = 900
const PERCENT = 100
const SHEET_URL = assetUrl('sprites/crew/firefighter.png')
// The feet are the point that moves: they are this far below the middle of a tile.
const FEET_OFFSET_ROWS = 0.35

type Phase = 'out' | 'working' | 'back'
type Point = { x: number; y: number }

type Props = {
  plan: TerrainPlan
  /** Where the firefighter gets off the fire engine, and where he kneels to fight the fire, in tiles from the north-west corner of the map. */
  from: Point
  to: Point
  /** How long he waits before he gets off, so that two do not walk on top of each other. */
  delayMilliseconds: number
  /** True while the fire lasts: the firefighter stays at it; once it is false he walks back to the fire engine. */
  isWorking: boolean
  onGone: () => void
}

/** A firefighter who walks from the fire engine to the burning aircraft, kneels with the hose while the fire lasts, then walks back. He only shows the work. */
function Firefighter({ plan, from, to, delayMilliseconds, isWorking, onGone }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const [phase, setPhase] = useState<Phase>('out')
  const isWorkingRef = useRef(isWorking)
  isWorkingRef.current = isWorking
  const onGoneRef = useRef(onGone)
  onGoneRef.current = onGone
  const rows = plan.tiles.length
  const columns = plan.tiles[0].length
  const start = useMemo(() => ({ x: from.x, y: from.y + FEET_OFFSET_ROWS }), [from])
  const work = useMemo(() => ({ x: to.x, y: to.y + FEET_OFFSET_ROWS }), [to])

  useEffect(() => {
    if (phase === 'working' && !isWorking) {
      setPhase('back')
    }
  }, [phase, isWorking])

  useEffect(() => {
    if (phase === 'working') {
      return
    }
    const element = ref.current!
    const points = phase === 'out' ? [start, work] : [work, start]
    const duration = Math.hypot(work.x - start.x, work.y - start.y) * MILLISECONDS_PER_TILE
    const timing = { duration, delay: phase === 'out' ? delayMilliseconds : 0, fill: 'both' as const }
    const pose: CrewPose = walkingPose(points[0], points[1])
    const moving = element.animate(
      points.map((point, index) => ({ offset: index, left: `${(point.x / columns) * PERCENT}%`, top: `${(point.y / rows) * PERCENT}%` })),
      { ...timing, easing: 'linear' },
    )
    const frame = { backgroundPositionY: `${pose.row * ROW_SHARE}%`, scale: pose.isFlipped ? '-1 1' : '1 1' }
    const turning = element.animate([frame, frame], timing)
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
  }, [phase, start, work, rows, columns, delayMilliseconds])

  const shown = phase === 'out' ? start : work

  return (
    <span
      ref={ref}
      className="crew-member"
      data-pose={phase === 'working' ? 'work' : 'walk'}
      data-sheet="firefighter"
      aria-hidden="true"
      style={{
        backgroundImage: `url(${SHEET_URL})`,
        left: `${(shown.x / columns) * PERCENT}%`,
        top: `${(shown.y / rows) * PERCENT}%`,
        backgroundPositionY: phase === 'working' ? `${WORK_ROW * ROW_SHARE}%` : undefined,
        scale: '1 1',
      }}
    />
  )
}

export default Firefighter
