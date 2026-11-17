import { useEffect, useState } from 'react'
import type { Player } from './useAccount'

export type Stock = 'fuel' | 'ammunition' | 'materials'
export type Part = 'engine' | 'wings' | 'fuselage' | 'armament'

export type Base = {
  terrainPlan: string
  resources: { supplies: number; fuel: number; ammunition: number; materials: number; commandPoints: number }
  buildings: string[]
  clock: { gameTime: string; paused: boolean }
  warehouse: { capacity: number; prices: Record<Stock, number> }
  workshop: {
    benches: number
    freeMechanics: number
    parts: { part: Part; materialCost: number; seconds: number }[]
    jobs: { id: number; part: Part; remainingSeconds: number; hasMechanic: boolean }[]
    readyParts: Record<Part, number>
  }
}

type ErrorPayload = { reason_phrase: string }

const BASE_URL = '/api/base'
const API_DOWN = 'apiDown'
const MILLISECONDS_PER_SECOND = 1000
// The API writes the game time without a time zone; read as UTC it shows as written.
const UTC_DESIGNATOR = 'Z'

async function request(url: string, body?: object): Promise<{ base: Base } | { error: string }> {
  try {
    const response = await fetch(url, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (response.ok) {
      return { base: (await response.json()) as Base }
    }
    return { error: ((await response.json()) as ErrorPayload).reason_phrase }
  } catch {
    return { error: API_DOWN }
  }
}

/** The game clock of the base, moved on by the seconds gone by since the API sent it. */
function clockAfter(base: Base, elapsedSeconds: number): { gameTime: Date; paused: boolean } {
  const receivedGameTime = Date.parse(`${base.clock.gameTime}${UTC_DESIGNATOR}`)
  return { gameTime: new Date(receivedGameTime + elapsedSeconds * MILLISECONDS_PER_SECOND), paused: base.clock.paused }
}

/** The base of the signed-in player, the orders they can give, the game clock, and the seconds left on each part being made. */
export function useBase(player: Player | null) {
  const [base, setBase] = useState<Base | null>(null)
  const [receivedAt, setReceivedAt] = useState(0)
  const [now, setNow] = useState(0)

  function receive(result: { base: Base } | { error: string }): string | null {
    if ('error' in result) {
      return result.error
    }
    setBase(result.base)
    setReceivedAt(Date.now())
    setNow(Date.now())
    return null
  }

  useEffect(() => {
    if (player === null) {
      setBase(null)
      return
    }
    void request(BASE_URL).then(receive)
  }, [player])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), MILLISECONDS_PER_SECOND)
    return () => clearInterval(timer)
  }, [])

  const isRunning = base !== null && !base.clock.paused
  const elapsedSeconds = isRunning ? Math.floor((now - receivedAt) / MILLISECONDS_PER_SECOND) : 0
  const jobs = (base?.workshop.jobs ?? []).map((job) => ({ ...job, remainingSeconds: Math.max(0, job.remainingSeconds - elapsedSeconds) }))
  const hasFinishedJob = jobs.some((job) => job.remainingSeconds === 0)
  const clock = base === null ? null : clockAfter(base, elapsedSeconds)

  useEffect(() => {
    if (hasFinishedJob) {
      void request(BASE_URL).then(receive)
    }
  }, [hasFinishedJob])

  /** Each order returns the code of the error the API gave, or null when it worked. */
  async function buy(resource: Stock, quantity: number): Promise<string | null> {
    return receive(await request(`${BASE_URL}/purchase`, { resource, quantity }))
  }

  async function produce(part: Part, withMechanic: boolean): Promise<string | null> {
    return receive(await request(`${BASE_URL}/production`, { part, withMechanic }))
  }

  async function setPaused(paused: boolean): Promise<string | null> {
    return receive(await request(`${BASE_URL}/clock`, { paused }))
  }

  return { base, jobs, clock, buy, produce, setPaused }
}
