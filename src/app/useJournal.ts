import { useEffect, useState } from 'react'
import type { BaseEvent } from './useBase'

const JOURNAL_URL = '/api/base/journal'

/** The pages of the journal of the base, the oldest first, once the API has sent them. */
export function useJournal(): BaseEvent[] | null {
  const [pages, setPages] = useState<BaseEvent[] | null>(null)

  useEffect(() => {
    void fetch(JOURNAL_URL)
      .then((response) => response.json() as Promise<{ pages: BaseEvent[] }>)
      .then((payload) => setPages(payload.pages))
  }, [])

  return pages
}
