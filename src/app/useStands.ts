import { useEffect, useRef } from 'react'
import { assignStands } from './stands'

type Remembered = { stands: Map<number, number>; waitingIds: number[] }

/**
 * Where each aircraft on the ground stands, kept from one render to the next so that an aircraft does not move while it is there, and the aircraft that have just got
 * a stand after waiting for one: the first render is never one of them, the aircraft that waited when the page was opened simply stand there.
 */
export function useStands(aircraftIds: number[], busyIds: number[], standCount: number): { stands: Map<number, number>; emergedIds: number[] } {
  const remembered = useRef<Remembered | undefined>(undefined)
  const stands = assignStands(aircraftIds, busyIds, standCount, remembered.current?.stands ?? new Map())
  const emergedIds = aircraftIds.filter((aircraftId) => remembered.current?.waitingIds.includes(aircraftId) === true && stands.has(aircraftId))
  useEffect(() => {
    remembered.current = { stands, waitingIds: aircraftIds.filter((aircraftId) => !busyIds.includes(aircraftId) && !stands.has(aircraftId)) }
  })
  return { stands, emergedIds }
}
