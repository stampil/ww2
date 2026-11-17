import { useEffect, useState } from 'react'
import type { Player } from './useAccount'

const SQUADRON_URL = '/api/squadron'

type Pilot = {
  id: number
  name: string
  rank: number
  fatigue: number
  stress: number
  effectiveAccuracy: number
  effectiveResilience: number
}
type Aircraft = {
  id: number
  durability: number
  model: { name: string; category: string; durability: number; maneuverability: number; fuelCapacity: number; ammunitionCapacity: number }
}
export type Squadron = { pilots: Pilot[]; aircraft: Aircraft[] }

/** The pilots and the aircraft of the signed-in player, once the API has sent them, and again each time the version changes. */
export function useSquadron(player: Player, version: number | null): Squadron | null {
  const [squadron, setSquadron] = useState<Squadron | null>(null)

  useEffect(() => {
    void fetch(SQUADRON_URL)
      .then((response) => response.json() as Promise<Squadron>)
      .then(setSquadron)
  }, [player, version])

  return squadron
}
