import { useEffect, useRef } from 'react'
import { assignStands } from './stands'

/** Where each aircraft on the ground stands, kept from one render to the next so that an aircraft does not move while it is there. */
export function useStands(aircraftIds: number[], busyIds: number[], standCount: number): Map<number, number> {
  const remembered = useRef(new Map<number, number>())
  const stands = assignStands(aircraftIds, busyIds, standCount, remembered.current)
  useEffect(() => {
    remembered.current = stands
  })
  return stands
}
