import { useEffect, useState } from 'react'

export type SiteChoice = { site: string; free: boolean }

const SITES_URL = '/api/world/sites'

/** The sites a new player can choose a base on, once the API has sent them; read again when `version` changes. */
export function useSites(version: number): SiteChoice[] | null {
  const [sites, setSites] = useState<SiteChoice[] | null>(null)

  useEffect(() => {
    void fetch(SITES_URL)
      .then((response) => response.json() as Promise<{ sites: SiteChoice[] }>)
      .then((payload) => setSites(payload.sites))
  }, [version])

  return sites
}
