import { useEffect, useState } from 'react'

/** A site of the map: whether it is free, the side it belongs to, and the nickname of the player who holds it. */
export type SiteChoice = { site: string; free: boolean; clan: string; holder: string | null }

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
