import { useEffect, useState } from 'react'

export type ApiStatus = 'checking' | 'ready' | 'databaseDown' | 'apiDown'

type HealthPayload = { database: string }

const DATABASE_OK = 'ok'

/** Asks the API how it is doing once, when the page opens. */
export function useApiStatus(): ApiStatus {
  const [status, setStatus] = useState<ApiStatus>('checking')

  useEffect(() => {
    fetch('/api/health')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Health check answered ${response.status}`)
        }
        return response.json() as Promise<HealthPayload>
      })
      .then((health) => setStatus(health.database === DATABASE_OK ? 'ready' : 'databaseDown'))
      .catch(() => setStatus('apiDown'))
  }, [])

  return status
}
