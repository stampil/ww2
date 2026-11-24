import { useEffect, useState } from 'react'
import type { Clan } from './useBase'

/** What the stores of a camp hold, which every player can see. */
export type CampResources = { supplies: number; fuel: number; ammunition: number; materials: number }

/** A site of the map: whether it is free, the side that holds it, the nickname of the player who holds it, null for a free site and for the AI, whether the AI holds it, what its stores hold, null while it has none, how many aircraft stand there, and whether a raid hurt it a few minutes ago. */
export type SiteChoice = { site: string; free: boolean; clan: Clan; holder: string | null; ai: boolean; resources: CampResources | null; aircraft: number; attacked: boolean }

/** The sites where a new player can settle, in the oldest world that has room. */
export const CHOOSABLE_SITES_URL = '/api/world/sites'
/** The sites of the world the player already plays in. */
export const INSTANCE_SITES_URL = '/api/world/map'

/** The sites that the API gives at this address, once it has sent them; read again when `version` changes. */
export function useSites(url: string, version = 0): SiteChoice[] | null {
  const [sites, setSites] = useState<SiteChoice[] | null>(null)

  useEffect(() => {
    void fetch(url)
      .then((response) => response.json() as Promise<{ sites: SiteChoice[] }>)
      .then((payload) => setSites(payload.sites))
  }, [url, version])

  return sites
}
