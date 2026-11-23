import { useCallback, useRef } from 'react'
import type { Cell, TerrainPlan } from '../plans/terrainPlan'
import Firefighter from './Firefighter'

const CREW_SIZE = 2
const GET_OFF_DELAY_MILLISECONDS = 700
// Where the firefighters kneel, from the middle of the stand: at the wing of the aircraft, the second a little below the first.
const WORK_POINTS = [
  { column: 0.62, row: -0.05 },
  { column: 0.62, row: 0.3 },
]

type Props = {
  plan: TerrainPlan
  /** The stand of the burning aircraft, and where the fire engine stopped, in tiles from the north-west corner of the map. */
  stand: Cell
  engine: { x: number; y: number }
  /** True while the fire lasts. */
  isFighting: boolean
  /** Called once every firefighter is back on the fire engine. */
  onBack: () => void
}

/** The two firefighters of a fire engine: they get off one after the other, fight the fire kneeling while it lasts, and climb back on. */
function Firefighters({ plan, stand, engine, isFighting, onBack }: Props) {
  const backCount = useRef(0)
  const reportBack = useCallback(() => {
    backCount.current += 1
    if (backCount.current === CREW_SIZE) {
      onBack()
    }
  }, [onBack])

  return WORK_POINTS.map((point, index) => (
    <Firefighter
      key={index}
      plan={plan}
      from={engine}
      to={{ x: stand.column + 0.5 + point.column, y: stand.row + 0.5 + point.row }}
      delayMilliseconds={index * GET_OFF_DELAY_MILLISECONDS}
      isWorking={isFighting}
      onGone={reportBack}
    />
  ))
}

export default Firefighters
