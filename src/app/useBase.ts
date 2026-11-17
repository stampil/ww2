import { useEffect, useState } from 'react'
import type { Player } from './useAccount'

export type Stock = 'fuel' | 'ammunition' | 'materials'
export type Part = 'engine' | 'wings' | 'fuselage' | 'armament'
export type MissionType = 'reconnaissance' | 'airCombat' | 'bombing'

/** A mission on the table; the category is the only one that can fly it, or null when any aircraft can. */
export type Offer = {
  id: number
  type: MissionType
  category: 'fighter' | 'bomber' | null
  aircraftCount: number
  durationSeconds: number
  fuelPerAircraft: number
  ammunitionPerAircraft: number
  risk: number
  rewardSupplies: number
  rewardCommandPoints: number
}
/** A mission under way: its crews, what each aircraft carries, and the game seconds left before it is back. */
export type Flight = {
  id: number
  type: MissionType
  remainingSeconds: number
  fuelLoaded: number
  ammunitionLoaded: number
  crews: { pilotId: number; aircraftId: number }[]
}

/** What a mission did to each crew, and what it paid; the newest report comes first. */
export type Report = {
  id: number
  type: MissionType
  success: boolean
  windSpeed: number
  suppliesWon: number
  commandPointsWon: number
  crews: { pilotName: string; aircraftName: string; damage: number; aircraftLost: boolean; pilotKilled: boolean }[]
}

export type Base = {
  terrainPlan: string
  resources: { supplies: number; fuel: number; ammunition: number; materials: number; commandPoints: number }
  buildings: string[]
  clock: { gameTime: string }
  warehouse: { capacity: number; prices: Record<Stock, number> }
  workshop: {
    benches: number
    freeMechanics: number
    parts: { part: Part; materialCost: number; seconds: number }[]
    jobs: { id: number; part: Part; remainingSeconds: number; hasMechanic: boolean }[]
    readyParts: Record<Part, number>
  }
  headquarters: { weather: { windSpeed: number }; offers: Offer[]; flights: Flight[]; reports: Report[] }
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

/** The items with the seconds gone by since the API sent them taken off what they have left, down to zero. */
function countDown<Item extends { remainingSeconds: number }>(items: Item[], elapsedSeconds: number): Item[] {
  return items.map((item) => ({ ...item, remainingSeconds: Math.max(0, item.remainingSeconds - elapsedSeconds) }))
}

/** Whether a countdown that had time left when the API sent it has run out since. */
function hasEnded(received: { remainingSeconds: number }[], shown: { remainingSeconds: number }[]): boolean {
  for (let place = 0; place < shown.length; place += 1) {
    if (received[place].remainingSeconds > 0 && shown[place].remainingSeconds === 0) {
      return true
    }
  }
  return false
}

/** The game time of the base, moved on by the seconds gone by since the API sent it. */
function gameTimeAfter(base: Base, elapsedSeconds: number): Date {
  const receivedGameTime = Date.parse(`${base.clock.gameTime}${UTC_DESIGNATOR}`)
  return new Date(receivedGameTime + elapsedSeconds * MILLISECONDS_PER_SECOND)
}

/** The base of the signed-in player, the orders they can give, the game time, and the seconds left on each part being made and each flight. */
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

  const elapsedSeconds = Math.floor((now - receivedAt) / MILLISECONDS_PER_SECOND)
  const receivedJobs = base?.workshop.jobs ?? []
  const receivedFlights = base?.headquarters.flights ?? []
  const jobs = countDown(receivedJobs, elapsedSeconds)
  const flights = countDown(receivedFlights, elapsedSeconds)
  const hasEndedCountdown = hasEnded(receivedJobs, jobs) || hasEnded(receivedFlights, flights)
  const gameTime = base === null ? null : gameTimeAfter(base, elapsedSeconds)

  useEffect(() => {
    if (hasEndedCountdown) {
      void request(BASE_URL).then(receive)
    }
  }, [hasEndedCountdown])

  /** Each order returns the code of the error the API gave, or null when it worked. */
  async function buy(resource: Stock, quantity: number): Promise<string | null> {
    return receive(await request(`${BASE_URL}/purchase`, { resource, quantity }))
  }

  async function produce(part: Part, withMechanic: boolean): Promise<string | null> {
    return receive(await request(`${BASE_URL}/production`, { part, withMechanic }))
  }

  async function launchMission(missionId: number, pilotIds: number[], aircraftIds: number[], fuel: number, ammunition: number): Promise<string | null> {
    return receive(await request(`${BASE_URL}/missions/launch`, { missionId, pilotIds, aircraftIds, fuel, ammunition }))
  }

  async function receiveSquadron(missionId: number): Promise<string | null> {
    return receive(await request(`${BASE_URL}/missions/return`, { missionId }))
  }

  return { base, jobs, flights, gameTime, buy, produce, launchMission, receiveSquadron }
}
