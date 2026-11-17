import { useState } from 'react'

/** Where a player is in the first day: not started, under way, or over (finished or skipped). */
export type GuideStatus = 'new' | 'running' | 'over'

const STORAGE_KEY_PREFIX = 'french-touch-guide-'

function storageKeyOf(playerId: number): string {
  return `${STORAGE_KEY_PREFIX}${playerId}`
}

// Storage can be refused (private windows, blocked site data): the guide then starts again at each visit.
function readStatus(playerId: number): GuideStatus {
  try {
    const stored = window.localStorage.getItem(storageKeyOf(playerId))
    return stored === 'running' || stored === 'over' ? stored : 'new'
  } catch {
    return 'new'
  }
}

function saveStatus(playerId: number, status: GuideStatus): void {
  try {
    window.localStorage.setItem(storageKeyOf(playerId), status)
  } catch {
    // Nothing to do: the status only lives until the page is closed.
  }
}

/** The status of the guide for a player, kept in the browser. */
export function useGuideStatus(playerId: number): [GuideStatus, (status: GuideStatus) => void] {
  const [status, setStatus] = useState<GuideStatus>(() => readStatus(playerId))

  function change(next: GuideStatus): void {
    saveStatus(playerId, next)
    setStatus(next)
  }

  return [status, change]
}
