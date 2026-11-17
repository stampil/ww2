import { useCallback, useEffect, useState } from 'react'
import type { Cell, TerrainPlan } from '../plans/terrainPlan'
import type { ParkedAircraft } from './BaseMap'
import MaintenanceCrew from './MaintenanceCrew'

const CREW_START_DELAY_MILLISECONDS = 1500

type Crew = { aircraftId: number; stand: Cell; delayMilliseconds: number }

type Props = {
  plan: TerrainPlan
  /** The aircraft being inspected or repaired. */
  servicedAircraftIds: number[]
  parkedAircraft: ParkedAircraft[]
}

/** One mechanic for each aircraft that is being serviced: he comes when the work begins, stays while it lasts, and goes back to the workshop once it is done. */
function MaintenanceCrews({ plan, servicedAircraftIds, parkedAircraft }: Props) {
  const [crews, setCrews] = useState<Crew[]>([])
  const removeCrew = useCallback((aircraftId: number) => {
    setCrews((current) => current.filter((crew) => crew.aircraftId !== aircraftId))
  }, [])

  useEffect(() => {
    setCrews((current) => {
      const added: Crew[] = []
      for (const aircraftId of servicedAircraftIds) {
        const parked = parkedAircraft.find((candidate) => candidate.id === aircraftId)
        if (parked !== undefined && !current.some((crew) => crew.aircraftId === aircraftId)) {
          added.push({ aircraftId, stand: parked.stand, delayMilliseconds: (current.length + added.length) * CREW_START_DELAY_MILLISECONDS })
        }
      }
      return added.length === 0 ? current : [...current, ...added]
    })
  }, [servicedAircraftIds, parkedAircraft])

  return crews.map((crew) => (
    <MaintenanceCrew
      key={crew.aircraftId}
      plan={plan}
      stand={crew.stand}
      delayMilliseconds={crew.delayMilliseconds}
      isWorking={servicedAircraftIds.includes(crew.aircraftId)}
      onGone={() => removeCrew(crew.aircraftId)}
    />
  ))
}

export default MaintenanceCrews
