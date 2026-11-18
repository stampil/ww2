import { useEffect, useState } from 'react'
import type { Player } from './useAccount'

export type Stock = 'fuel' | 'ammunition' | 'materials'
export type Part = 'engine' | 'wings' | 'fuselage' | 'armament'
export type MissionType = 'reconnaissance' | 'airCombat' | 'fighterCombat' | 'groundAttack' | 'bombing'

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
/** Where an aircraft is on the grid of a dogfight, and which way it points: 0 north, 1 east, 2 south, 3 west. */
export type DogfightPosition = { x: number; y: number; heading: number }
export type DogfightOutcome = 'won' | 'escaped'
export type DogfightState = { turn: number; player: DogfightPosition; enemy: DogfightPosition; outcome: DogfightOutcome | null }
export type Maneuver = 'accelerate' | 'turnLeft' | 'turnRight' | 'slipLeft' | 'slipRight'
/** A call to the player during a flight: a dogfight for one aircraft, that shows when `dueSeconds` is down to zero, and is won or lost in `moves` moves. */
export type FlightAlert = {
  id: number
  kind: 'dogfight' | 'cockpit'
  aircraftId: number
  dueSeconds: number
  arenaSize: number
  moves: number
  state: DogfightState | null
  /** For a dogfight flown from the cockpit: null before the player takes the controls, then how it ended once it is over. */
  cockpit: { outcome: DogfightOutcome | null } | null
}

/** A mission under way: its crews, what each aircraft carries, the game seconds left before it is back, and its alerts. */
export type Flight = {
  id: number
  type: MissionType
  remainingSeconds: number
  fuelLoaded: number
  ammunitionLoaded: number
  crews: { pilotId: number; aircraftId: number }[]
  alerts: FlightAlert[]
}

export type Pilot = {
  id: number
  name: string
  rank: number
  fatigue: number
  stress: number
  effectiveAccuracy: number
  effectiveResilience: number
}
export type Aircraft = {
  id: number
  /** The number painted on its fin, which it keeps. */
  number: number
  durability: number
  model: { name: string; category: string; durability: number; maneuverability: number; fuelCapacity: number; ammunitionCapacity: number }
}
export type Squadron = { pilots: Pilot[]; aircraft: Aircraft[] }

/**
 * What the hangar knows of an aircraft: whether it is to inspect and the seconds left of the inspection, the modules destroyed, and the
 * seconds left of a repair or before a fire reaches the fuel. While an aircraft is to inspect, its modules and its repair are not known (null).
 */
export type HangarAircraft = {
  aircraftId: number
  needsInspection: boolean
  inspectionDurationSeconds: number
  inspectionSeconds: number | null
  destroyedModules: Part[] | null
  repairDurationSeconds: number | null
  repairSeconds: number | null
  fireSeconds: number | null
}
export type Rest = { pilotId: number; remainingSeconds: number }

/** What a mission did to each crew, and what it paid. */
export type MissionReport = {
  kind: 'mission'
  id: number
  type: MissionType
  success: boolean
  windSpeed: number
  suppliesWon: number
  commandPointsWon: number
  /** Whether the reconnaissance spotted a better paid mission; absent from the reports kept before missions could be spotted. */
  spottedMission?: boolean
  crews: {
    pilotName: string
    aircraftName: string
    damage: number
    burning: boolean
    aircraftLost: boolean
    pilotKilled: boolean
  }[]
}
export type ExplosionEvent = { kind: 'explosion'; id: number; aircraftName: string; pilotName: string | null; pilotKilled: boolean }
/** What happened at the base; the newest event comes first. */
export type BaseEvent = MissionReport | ExplosionEvent

export type UpgradeName = 'hangar' | 'workshop' | 'warehouse'
/** What the command points buy for a building; the cost is null at the top level. */
export type UpgradeInfo = { upgrade: UpgradeName; level: number; maxLevel: number; cost: number | null }
/** The battle of the base: the enemy aircraft shot down against the target, and how it stands. */
export type Battle = { kills: number; target: number; status: 'ongoing' | 'won' | 'lost' }

export type Base = {
  /** The site the base stands on. */
  site: string
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
  headquarters: { weather: { windSpeed: number }; offers: Offer[]; flights: Flight[] }
  roster: { rests: Rest[]; recruitment: { cost: number; maxPilots: number } }
  hangar: { aircraft: HangarAircraft[] }
  squadron: Squadron
  events: BaseEvent[]
  upgrades: UpgradeInfo[]
  battle: Battle
}

type ErrorPayload = { reason_phrase: string }

const BASE_URL = '/api/base'
const API_DOWN = 'apiDown'
const NO_BASE = 'noBase'
const CLAIM_URL = '/api/world/claim'
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

/** The seconds left of something that may not be running, taken down by the seconds gone by, to zero. */
function remainingAfter(seconds: number | null, elapsedSeconds: number): number | null {
  return seconds === null ? null : Math.max(0, seconds - elapsedSeconds)
}

/** Whether the aircraft of the hangar have an inspection, a repair or a fire whose countdown has run out since the API sent it. */
function hasHangarCountdownEnded(received: HangarAircraft[], shown: HangarAircraft[]): boolean {
  for (let place = 0; place < shown.length; place += 1) {
    const inspectionEnded = (received[place].inspectionSeconds ?? 0) > 0 && shown[place].inspectionSeconds === 0
    const repairEnded = (received[place].repairSeconds ?? 0) > 0 && shown[place].repairSeconds === 0
    const fireEnded = (received[place].fireSeconds ?? 0) > 0 && shown[place].fireSeconds === 0
    if (inspectionEnded || repairEnded || fireEnded) {
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

/** The base of the signed-in player, the orders they can give, the game time, and the seconds left on each part being made, flight, repair, fire and rest. */
export function useBase(player: Player | null) {
  const [base, setBase] = useState<Base | null>(null)
  const [hasNoBase, setHasNoBase] = useState(false)
  const [receivedAt, setReceivedAt] = useState(0)
  const [now, setNow] = useState(0)

  function receive(result: { base: Base } | { error: string }): string | null {
    if ('error' in result) {
      return result.error
    }
    setBase(result.base)
    setHasNoBase(false)
    setReceivedAt(Date.now())
    setNow(Date.now())
    return null
  }

  useEffect(() => {
    if (player === null) {
      setBase(null)
      return
    }
    void request(BASE_URL).then((result) => {
      if ('error' in result && result.error === NO_BASE) {
        setHasNoBase(true)
        return
      }
      receive(result)
    })
  }, [player])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), MILLISECONDS_PER_SECOND)
    return () => clearInterval(timer)
  }, [])

  const elapsedSeconds = Math.floor((now - receivedAt) / MILLISECONDS_PER_SECOND)
  const receivedJobs = base?.workshop.jobs ?? []
  const receivedFlights = base?.headquarters.flights ?? []
  const receivedHangar = base?.hangar.aircraft ?? []
  const receivedRests = base?.roster.rests ?? []
  const jobs = countDown(receivedJobs, elapsedSeconds)
  const flights = countDown(receivedFlights, elapsedSeconds).map((flight) => ({
    ...flight,
    alerts: flight.alerts.map((alert) => ({ ...alert, dueSeconds: Math.max(0, alert.dueSeconds - elapsedSeconds) })),
  }))
  const rests = countDown(receivedRests, elapsedSeconds)
  const hangarAircraft = receivedHangar.map((state) => ({
    ...state,
    inspectionSeconds: remainingAfter(state.inspectionSeconds, elapsedSeconds),
    repairSeconds: remainingAfter(state.repairSeconds, elapsedSeconds),
    fireSeconds: remainingAfter(state.fireSeconds, elapsedSeconds),
  }))
  const hasEndedCountdown =
    hasEnded(receivedJobs, jobs) || hasEnded(receivedFlights, flights) || hasEnded(receivedRests, rests) || hasHangarCountdownEnded(receivedHangar, hangarAircraft)
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

  async function startAlert(alertId: number): Promise<string | null> {
    return receive(await request(`${BASE_URL}/alerts/start`, { alertId }))
  }

  async function playAlert(alertId: number, maneuver: Maneuver): Promise<string | null> {
    return receive(await request(`${BASE_URL}/alerts/play`, { alertId, maneuver }))
  }

  async function finishAlert(alertId: number, outcome: DogfightOutcome): Promise<string | null> {
    return receive(await request(`${BASE_URL}/alerts/finish`, { alertId, outcome }))
  }

  async function receiveSquadron(missionId: number): Promise<string | null> {
    return receive(await request(`${BASE_URL}/missions/return`, { missionId }))
  }

  async function inspectAircraft(aircraftId: number): Promise<string | null> {
    return receive(await request(`${BASE_URL}/hangar/inspect`, { aircraftId }))
  }

  async function repairAircraft(aircraftId: number): Promise<string | null> {
    return receive(await request(`${BASE_URL}/hangar/repair`, { aircraftId }))
  }

  async function restPilot(pilotId: number): Promise<string | null> {
    return receive(await request(`${BASE_URL}/pilots/rest`, { pilotId }))
  }

  async function recruitPilot(): Promise<string | null> {
    return receive(await request(`${BASE_URL}/pilots/recruit`, {}))
  }

  async function buyUpgrade(upgrade: UpgradeName): Promise<string | null> {
    return receive(await request(`${BASE_URL}/upgrades/buy`, { upgrade }))
  }

  /** Takes a free site for the player, who holds no base yet. */
  async function claimBase(site: string): Promise<string | null> {
    return receive(await request(CLAIM_URL, { site }))
  }

  async function resetGame(): Promise<string | null> {
    return receive(await request(`${BASE_URL}/reset`, {}))
  }

  async function restartBattle(): Promise<string | null> {
    return receive(await request(`${BASE_URL}/battle/restart`, {}))
  }

  return {
    base,
    hasNoBase,
    jobs,
    flights,
    hangarAircraft,
    rests,
    gameTime,
    buy,
    produce,
    launchMission,
    startAlert,
    playAlert,
    finishAlert,
    receiveSquadron,
    inspectAircraft,
    repairAircraft,
    restPilot,
    recruitPilot,
    buyUpgrade,
    resetGame,
    restartBattle,
    claimBase,
  }
}
