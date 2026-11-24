import { useEffect, useRef, useState } from 'react'
import type { Livery } from '../three/liveries'
import { parseGameTime } from './gameDate'
import type { Player } from './useAccount'

export type Stock = 'fuel' | 'ammunition' | 'materials'
/** The two sides of the war; the Allies are still called the French, as on the server. */
export type Clan = 'french' | 'axe'
export type Part = 'engine' | 'wings' | 'fuselage' | 'armament'
export type MissionType = 'reconnaissance' | 'airCombat' | 'fighterCombat' | 'groundAttack' | 'raid' | 'campCapture'
/** The two missions sent against an enemy camp, which the player picks on the map. */
export type AttackKind = 'raid' | 'campCapture'

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
  /** The difficulty of the mission, from 1 to 3. */
  risk: number
  remainingSeconds: number
  fuelLoaded: number
  ammunitionLoaded: number
  /** The wind the flight left in, in km/h, and the site of the camp it is sent against, if it is an attack. */
  windSpeed: number
  targetSite: string | null
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
  livery: Livery
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
/** What an attack did to its camp: nothing when it failed or the camp could no longer be attacked (`reason` says why), the damage of a raid, or the camp taken. */
export type AttackResult = {
  result: 'repelled' | 'calledOff' | 'raided' | 'captured' | 'noLanding'
  reason?: string
  defenseLost?: number
  building?: string | null
  aircraftLost?: boolean
}
export type MissionReport = {
  kind: 'mission'
  id: number
  type: MissionType
  success: boolean
  windSpeed: number
  /** How dangerous the mission was, from 1 to 3, and how long it lasted; absent from the reports kept before the journal told them. */
  risk?: number
  durationSeconds?: number
  suppliesWon: number
  commandPointsWon: number
  /** Whether the reconnaissance spotted a better paid mission; absent from the reports kept before missions could be spotted. */
  spottedMission?: boolean
  /** The camp an attack was sent against, and what it did; absent from the reports of the other missions. */
  targetSite?: string | null
  attack?: AttackResult | null
  crews: {
    pilotName: string
    aircraftName: string
    /** Whether this crew did what the mission asked; absent from the reports kept before the journal told it. */
    succeeded?: boolean
    damage: number
    burning: boolean
    aircraftLost: boolean
    pilotKilled: boolean
    /** The gauges of the pilot after the flight; absent from the reports kept before the journal told them. */
    fatigue?: number
    stress?: number
  }[]
}
export type ExplosionEvent = { kind: 'explosion'; id: number; aircraftName: string; pilotName: string | null; pilotKilled: boolean }
/** What can be given to another base: supplies and the three stocks. */
export type GiftResource = 'supplies' | Stock
/** A gift from another base: who gave it, from which site, and what, with the quantity of a resource or the name of a pilot or an aircraft. */
export type GiftEvent = {
  kind: 'gift'
  id: number
  from: string
  site: string
  item: GiftResource | 'pilot' | 'aircraft'
  quantity: number | null
  name: string | null
}
/** An aircraft of another base landed here with a load of resources, as much as the warehouse could take; the journal of a landing before the supply flights has no materials or supplies. */
export type LandingEvent = { kind: 'landing'; id: number; from: string; site: string; aircraftName: string; fuel: number; ammunition: number; materials?: number; supplies?: number }
/** The base took a camp, or let one go, when an aircraft landed on it or the last one left. */
export type CampEvent = { kind: 'campTaken'; id: number; site: string } | { kind: 'campLost'; id: number; site: string; capturedBy?: string }
/** A raid by another player hurt the camp: who flew it, how much defense it cost, the building it destroyed and whether an aircraft was lost. */
export type RaidedEvent = { kind: 'raided'; id: number; site: string; by: string; defenseLost: number; building: string | null; aircraftLost: boolean }
/** What happened at the base, with the game time it happened at, which the events kept before the journal dated them do not have; the newest event comes first. */
export type BaseEvent = (MissionReport | ExplosionEvent | GiftEvent | LandingEvent | CampEvent | RaidedEvent) & { gameTime?: string }

export type UpgradeName = 'hangar' | 'workshop' | 'warehouse'
/** What the command points buy for a building; the cost is null at the top level. */
export type UpgradeInfo = { upgrade: UpgradeName; level: number; maxLevel: number; cost: number | null }
/** The battle of the base, which never ends: the enemy aircraft the player shot down, as a score. */
export type Battle = { kills: number }

/** An enemy camp that can be attacked, with its defense, the flight there and what refuses a raid or a capture now, if anything. */
export type AttackTarget = { baseId: number; site: string; holder: string; defense: number; flightSeconds: number; raidRefusal: string | null; captureRefusal: string | null }
/** What raids did to the camp: its defense, and the buildings that are destroyed until they are built again for `rebuildCost` materials. */
export type CampState = { defense: number; destroyed: string[]; rebuildCost: number }

/** A base the player holds, with the site it stands on. */
export type HeldBase = { id: number; site: string }
/** A base a gift can go to: one of the player's own, or an ally's, with the nickname of its holder. */
export type Recipient = { id: number; site: string; holder: string; kinship: 'own' | 'ally' }
/** A base an aircraft can be stationed at: a recipient, or a free camp, which the aircraft takes by landing there first. */
export type Destination = { id: number; site: string; holder: string | null; kinship: 'own' | 'ally' | 'free'; flightSeconds: number }

/** Where a stationed aircraft stands: flying out to the camp, standing there until it is recalled, or flying back. */
export type StationingPhase = 'outbound' | 'stationed' | 'returning'
/** An aircraft of the base that is stationed away, with the camp it went to; the seconds left are those of the flight out or back, which takes `flightSeconds` each way. */
export type AwayAircraft = {
  aircraftId: number
  pilotId: number
  site: string
  phase: StationingPhase
  remainingSeconds: number
  flightSeconds: number
}
/** An aircraft of another base stationed here, with its pilot and whose it is. */
export type GuestAircraft = {
  aircraftId: number
  aircraftName: string
  aircraftNumber: number
  pilotName: string
  site: string
  holder: string
  kinship: 'own' | 'ally'
  phase: StationingPhase
  remainingSeconds: number
  flightSeconds: number
}

/** What a supply flight carries, a quantity of each resource. */
export type Cargo = { fuel: number; ammunition: number; materials: number; supplies: number }

export type Base = {
  /** The id of this base, among the bases the player holds (the one they took first at the head), and how many bases a player can hold. */
  baseId: number
  bases: HeldBase[]
  baseLimit: number
  recipients: Recipient[]
  destinations: Destination[]
  /** The site the base stands on. */
  site: string
  /** The side of the base, which is the side of its site. */
  clan: Clan
  terrainPlan: string
  resources: { supplies: number; fuel: number; ammunition: number; materials: number; commandPoints: number }
  /** The supplies the camp earns each minute by itself, fewer near the front. */
  supplyIncome: number
  buildings: string[]
  camp: CampState
  targets: AttackTarget[]
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
  stationings: { away: AwayAircraft[]; guests: GuestAircraft[] }
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
const POLL_MILLISECONDS = 5000
// An order that the API has not answered by then is given up on: the next poll shows whether it went through.
const REQUEST_TIMEOUT_MILLISECONDS = 10000

async function request(url: string, body?: object): Promise<{ base: Base } | { error: string }> {
  try {
    const response = await fetch(url, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MILLISECONDS),
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
  const receivedGameTime = parseGameTime(base.clock.gameTime).getTime()
  return new Date(receivedGameTime + elapsedSeconds * MILLISECONDS_PER_SECOND)
}

/** The base of the signed-in player, the orders they can give, the game time, and the seconds left on each part being made, flight, repair, fire and rest. */
export function useBase(player: Player | null) {
  const [base, setBase] = useState<Base | null>(null)
  const [hasNoBase, setHasNoBase] = useState(false)
  const [receivedAt, setReceivedAt] = useState(0)
  const [now, setNow] = useState(0)
  const lastReceivedAt = useRef(0)

  function receive(result: { base: Base } | { error: string }): string | null {
    if ('error' in result) {
      return result.error
    }
    setBase(result.base)
    setHasNoBase(false)
    lastReceivedAt.current = Date.now()
    setReceivedAt(lastReceivedAt.current)
    setNow(lastReceivedAt.current)
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

  // The server has the last word on the camps: what other players did to them shows within a few seconds.
  useEffect(() => {
    if (player === null) {
      return
    }
    const timer = setInterval(() => {
      if (document.hidden) {
        return
      }
      const startedAt = Date.now()
      void request(BASE_URL).then((result) => {
        // An order given while this was on its way has a newer answer, which this one must not undo.
        if (lastReceivedAt.current < startedAt) {
          receive(result)
        }
      })
    }, POLL_MILLISECONDS)
    return () => clearInterval(timer)
  }, [player])

  const elapsedSeconds = Math.floor((now - receivedAt) / MILLISECONDS_PER_SECOND)
  const receivedJobs = base?.workshop.jobs ?? []
  const receivedFlights = base?.headquarters.flights ?? []
  const receivedHangar = base?.hangar.aircraft ?? []
  const receivedRests = base?.roster.rests ?? []
  const receivedAway = base?.stationings.away ?? []
  const receivedGuests = base?.stationings.guests ?? []
  const jobs = countDown(receivedJobs, elapsedSeconds)
  const flights = countDown(receivedFlights, elapsedSeconds).map((flight) => ({
    ...flight,
    alerts: flight.alerts.map((alert) => ({ ...alert, dueSeconds: Math.max(0, alert.dueSeconds - elapsedSeconds) })),
  }))
  const rests = countDown(receivedRests, elapsedSeconds)
  const away = countDown(receivedAway, elapsedSeconds)
  const guests = countDown(receivedGuests, elapsedSeconds)
  const hangarAircraft = receivedHangar.map((state) => ({
    ...state,
    inspectionSeconds: remainingAfter(state.inspectionSeconds, elapsedSeconds),
    repairSeconds: remainingAfter(state.repairSeconds, elapsedSeconds),
    fireSeconds: remainingAfter(state.fireSeconds, elapsedSeconds),
  }))
  const hasEndedCountdown =
    hasEnded(receivedJobs, jobs) ||
    hasEnded(receivedFlights, flights) ||
    hasEnded(receivedRests, rests) ||
    hasEnded(receivedAway, away) ||
    hasEnded(receivedGuests, guests) ||
    hasHangarCountdownEnded(receivedHangar, hangarAircraft)
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

  async function attackCamp(targetBaseId: number, kind: AttackKind, pilotIds: number[], aircraftIds: number[]): Promise<string | null> {
    return receive(await request(`${BASE_URL}/missions/attack`, { targetBaseId, kind, pilotIds, aircraftIds }))
  }

  async function rebuild(building: string): Promise<string | null> {
    return receive(await request(`${BASE_URL}/buildings/rebuild`, { building }))
  }

  async function assembleAircraft(): Promise<string | null> {
    return receive(await request(`${BASE_URL}/workshop/assemble`, {}))
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

  /** Takes a free site for the player's first base, with a squadron, which they look at from then on. */
  async function claimBase(site: string): Promise<string | null> {
    return receive(await request(CLAIM_URL, { site }))
  }

  async function selectBase(baseId: number): Promise<string | null> {
    return receive(await request(`${BASE_URL}/select`, { baseId }))
  }

  async function givePilot(recipientBaseId: number, pilotId: number): Promise<string | null> {
    return receive(await request(`${BASE_URL}/gifts/pilot`, { recipientBaseId, pilotId }))
  }

  async function giveAircraft(recipientBaseId: number, aircraftId: number): Promise<string | null> {
    return receive(await request(`${BASE_URL}/gifts/aircraft`, { recipientBaseId, aircraftId }))
  }

  async function sendStationing(destinationBaseId: number, pilotId: number, aircraftId: number, fuel: number, ammunition: number): Promise<string | null> {
    return receive(await request(`${BASE_URL}/stationings/send`, { destinationBaseId, pilotId, aircraftId, fuel, ammunition }))
  }

  async function sendSupply(destinationBaseId: number, pilotId: number, aircraftId: number, cargo: Cargo): Promise<string | null> {
    return receive(await request(`${BASE_URL}/stationings/supply`, { destinationBaseId, pilotId, aircraftId, ...cargo }))
  }

  async function recallStationing(aircraftId: number): Promise<string | null> {
    return receive(await request(`${BASE_URL}/stationings/recall`, { aircraftId }))
  }

  async function resetGame(): Promise<string | null> {
    return receive(await request(`${BASE_URL}/reset`, {}))
  }

  return {
    base,
    hasNoBase,
    jobs,
    flights,
    hangarAircraft,
    rests,
    away,
    guests,
    gameTime,
    buy,
    produce,
    launchMission,
    attackCamp,
    rebuild,
    assembleAircraft,
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
    claimBase,
    selectBase,
    givePilot,
    giveAircraft,
    sendStationing,
    sendSupply,
    recallStationing,
  }
}
