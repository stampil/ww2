import { useCallback, useEffect, useState } from 'react'
import type { ComponentType } from 'react'
import { useTranslation } from 'react-i18next'
import { TERRAIN_PLANS } from '../plans/terrainPlan'
import type { BuildingName } from '../plans/terrainPlan'
import BaseChoice from './BaseChoice'
import BaseMap from './BaseMap'
import type { MapAlert, ParkedAircraft, StandStatus } from './BaseMap'
import BattleOver from './BattleOver'
import type { Arrival, Departure, Emergence } from './AirfieldView'
import CockpitCombatWindow from './CockpitCombatWindow'
import ControlTowerPanel from './ControlTowerPanel'
import DogfightWindow from './DogfightWindow'
import GroundAttackWindow from './GroundAttackWindow'
import type { GroundRunProps } from './GroundRunWindow'
import { busyCrews, findAlert, unavailableCrews } from './flights'
import { useStands } from './useStands'
import { damageLevelOf } from '../three/damageStages'
import GameWindow from './GameWindow'
import Guide from './Guide'
import { guideStepOf, markedBuildingOf, speaksInWindowOf } from './guideSteps'
import GuideWelcome from './GuideWelcome'
import HangarPanel from './HangarPanel'
import HeadquartersPanel from './HeadquartersPanel'
import Hud from './Hud'
import MissionToasts from './MissionToasts'
import ReconnaissanceWindow from './ReconnaissanceWindow'
import type { Player } from './useAccount'
import { useAircraftSprite } from './useAircraftSprite'
import ResetConfirm from './ResetConfirm'
import { useBase } from './useBase'
import type { Aircraft, HangarAircraft, MissionType, UpgradeName } from './useBase'
import { useGuideStatus } from './useGuideStatus'
import WarehousePanel from './WarehousePanel'
import WorkshopPanel from './WorkshopPanel'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
// The missions whose mini-game is flown from above, with the window that plays it.
const GROUND_RUN_WINDOWS: Partial<Record<MissionType, ComponentType<GroundRunProps>>> = {
  groundAttack: GroundAttackWindow,
  reconnaissance: ReconnaissanceWindow,
}

function standStatusOf(state: HangarAircraft, aircraft: Aircraft): StandStatus {
  if (state.fireSeconds !== null) {
    return 'burning'
  }
  if (state.inspectionSeconds !== null) {
    return 'inspecting'
  }
  if (state.repairSeconds !== null) {
    return 'repairing'
  }
  if (state.needsInspection || (state.destroyedModules ?? []).length > 0 || aircraft.durability < aircraft.model.durability) {
    return 'damaged'
  }
  return 'ready'
}

/** The base of the player who is signed in, played on its map: a strip of figures over the airfield, the aircraft parked, and a window for each building opened on it. */
function BaseScreen({ player }: { player: Player }) {
  const { t } = useTranslation()
  const {
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
    selectBase,
    giveResource,
    givePilot,
    giveAircraft,
    sendStationing,
    recallStationing,
  } = useBase(player)
  const aircraftSprite = useAircraftSprite()
  const [openBuilding, setOpenBuilding] = useState<BuildingName | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [departures, setDepartures] = useState<Departure[]>([])
  const [landingIds, setLandingIds] = useState<number[]>([])
  const [emergingIds, setEmergingIds] = useState<number[]>([])
  const [guideStatus, setGuideStatus] = useGuideStatus(player.id)
  const [isConfirmingReset, setIsConfirmingReset] = useState(false)
  const [duelAlertId, setDuelAlertId] = useState<number | null>(null)
  const removeDeparture = useCallback((aircraftId: number) => {
    setDepartures((current) => current.filter((departure) => departure.aircraftId !== aircraftId))
  }, [])
  const removeLanding = useCallback((aircraftId: number) => {
    setLandingIds((current) => current.filter((landingId) => landingId !== aircraftId))
    setEmergingIds((current) => current.filter((emergingId) => emergingId !== aircraftId))
  }, [])
  const busy = busyCrews(flights, away)
  const { stands, emergedIds } = useStands(base?.squadron.aircraft.map((aircraft) => aircraft.id) ?? [], busy.aircraftIds, base === null ? 0 : TERRAIN_PLANS[base.terrainPlan].stands.length)
  const canAnimate = aircraftSprite !== null && !window.matchMedia(REDUCED_MOTION_QUERY).matches
  useEffect(() => {
    if (emergedIds.length > 0 && canAnimate) {
      setEmergingIds((current) => [...current, ...emergedIds])
    }
  }, [emergedIds, canAnimate])
  // What is going on in one base means nothing in another: the windows and the animations start again when the player looks at a different base.
  const baseId = base?.baseId
  useEffect(() => {
    setOpenBuilding(null)
    setDepartures([])
    setLandingIds([])
    setEmergingIds([])
    setDuelAlertId(null)
  }, [baseId])

  if (hasNoBase) {
    return <BaseChoice onClaim={claimBase} />
  }

  if (base === null || gameTime === null) {
    return null
  }

  async function order(sending: Promise<string | null>): Promise<void> {
    setErrorCode(await sending)
  }

  // The base is wiped and founded again; the guide of the first day comes back with it.
  async function startOver(): Promise<void> {
    setIsConfirmingReset(false)
    setOpenBuilding(null)
    setDuelAlertId(null)
    setDepartures([])
    setLandingIds([])
    setEmergingIds([])
    const resetErrorCode = await resetGame()
    setErrorCode(resetErrorCode)
    if (resetErrorCode === null) {
      setGuideStatus('new')
    }
  }

  // Once the orders are given the window closes, to show the squadron taking off, in groups of three.
  async function launch(missionId: number, pilotIds: number[], aircraftIds: number[], fuel: number, ammunition: number): Promise<void> {
    const departing = parkedAircraft.filter((aircraft) => aircraftIds.includes(aircraft.id))
    const launchErrorCode = await launchMission(missionId, pilotIds, aircraftIds, fuel, ammunition)
    setErrorCode(launchErrorCode)
    if (launchErrorCode === null) {
      setOpenBuilding(null)
      showDepartures(departing)
    }
  }

  // An aircraft stationed at another base takes off like a squadron sent on a mission.
  async function station(destinationBaseId: number, pilotId: number, aircraftId: number, fuel: number, ammunition: number): Promise<void> {
    const departing = parkedAircraft.filter((aircraft) => aircraft.id === aircraftId)
    const stationErrorCode = await sendStationing(destinationBaseId, pilotId, aircraftId, fuel, ammunition)
    setErrorCode(stationErrorCode)
    if (stationErrorCode === null) {
      setOpenBuilding(null)
      showDepartures(departing)
    }
  }

  function showDepartures(departing: ParkedAircraft[]): void {
    if (aircraftSprite !== null && !window.matchMedia(REDUCED_MOTION_QUERY).matches) {
      const leaving = departing.map((aircraft) => ({ aircraftId: aircraft.id, tailNumber: aircraft.number, stand: aircraft.stand }))
      setDepartures((current) => [...current, ...leaving])
    }
  }

  // The squadron is received: the window closes to show the aircraft that are left landing and taxiing to their stands.
  async function receive(missionId: number): Promise<void> {
    const crewAircraftIds = flights.find((flight) => flight.id === missionId)!.crews.map((crew) => crew.aircraftId)
    const receiveErrorCode = await receiveSquadron(missionId)
    setErrorCode(receiveErrorCode)
    if (receiveErrorCode === null) {
      setOpenBuilding(null)
      if (aircraftSprite !== null && !window.matchMedia(REDUCED_MOTION_QUERY).matches) {
        setLandingIds((current) => [...current, ...crewAircraftIds])
      }
    }
  }

  const plan = TERRAIN_PLANS[base.terrainPlan]
  const unavailable = unavailableCrews(busy, rests, hangarAircraft)
  const upgradeOf = (building: UpgradeName) => base.upgrades.find((candidate) => candidate.upgrade === building)!
  const servicedAircraftIds = hangarAircraft.filter((state) => state.inspectionSeconds !== null || state.repairSeconds !== null).map((state) => state.aircraftId)

  const parkedAircraft: ParkedAircraft[] = []
  const arrivals: Arrival[] = []
  const emergences: Emergence[] = []
  for (const aircraft of base.squadron.aircraft) {
    const standNumber = stands.get(aircraft.id)
    if (standNumber === undefined) {
      continue
    }
    const stand = plan.stands[standNumber]
    if (landingIds.includes(aircraft.id)) {
      arrivals.push({ aircraftId: aircraft.id, tailNumber: aircraft.number, stand, damageLevel: damageLevelOf(aircraft.durability, aircraft.model.durability) })
    } else if (emergingIds.includes(aircraft.id) || (canAnimate && emergedIds.includes(aircraft.id))) {
      emergences.push({ aircraftId: aircraft.id, tailNumber: aircraft.number, stand, damageLevel: damageLevelOf(aircraft.durability, aircraft.model.durability) })
    } else {
      const state = hangarAircraft.find((candidate) => candidate.aircraftId === aircraft.id)!
      parkedAircraft.push({ id: aircraft.id, number: aircraft.number, stand, status: standStatusOf(state, aircraft) })
    }
  }

  const alerts: MapAlert[] = []
  if (flights.some((flight) => flight.remainingSeconds === 0)) {
    alerts.push({ kind: 'mission', building: 'controlTower', label: t('base.alert') })
  }
  if (hangarAircraft.some((state) => state.fireSeconds !== null)) {
    alerts.push({ kind: 'fire', building: 'hangar', label: t('base.fireAlert') })
  }

  const duel = duelAlertId === null ? undefined : findAlert(flights, duelAlertId)
  const MissionWindow = duel === undefined ? undefined : GROUND_RUN_WINDOWS[duel.flight.type]
  const duelCrewPlace = duel?.flight.crews.find((crew) => crew.aircraftId === duel.alert.aircraftId)
  const duelCrew =
    duelCrewPlace === undefined
      ? undefined
      : {
          pilot: base.squadron.pilots.find((pilot) => pilot.id === duelCrewPlace.pilotId)!,
          aircraft: base.squadron.aircraft.find((aircraft) => aircraft.id === duelCrewPlace.aircraftId)!,
        }

  const guideStep = guideStepOf(guideStatus, { flights, eventCount: base.events.length, hangarAircraft })
  const markedBuilding = guideStep === null ? undefined : markedBuildingOf(guideStep)
  if (markedBuilding !== undefined) {
    alerts.push({ kind: 'guide', building: markedBuilding, label: t('guide.here') })
  }
  const guide = guideStep !== null && guideStep !== 'welcome' ? <Guide step={guideStep} onEnd={() => setGuideStatus('over')} /> : null

  const errorMessage = errorCode !== null && (
    <p className="game-message" role="alert">
      {t(`base.errors.${errorCode}`)}
    </p>
  )

  return (
    <section className="base game" aria-label={t('base.title')}>
      <h2 className="visually-hidden">{t('base.title')}</h2>
      <div className="stage">
        <Hud gameTime={gameTime} base={base} onSelectBase={(selectedBaseId) => void order(selectBase(selectedBaseId))} />
        <BaseMap
          plan={plan}
          servicedAircraftIds={servicedAircraftIds}
          parkedAircraft={parkedAircraft}
          aircraftSprite={aircraftSprite}
          departures={departures}
          onDeparted={removeDeparture}
          arrivals={arrivals}
          emergences={emergences}
          onLanded={removeLanding}
          alerts={alerts}
          openBuilding={openBuilding}
          onSelect={setOpenBuilding}
        />
      </div>

      <MissionToasts flights={flights} squadron={base.squadron} onOpen={setDuelAlertId} />
      {openBuilding === null && guide}
      <div className="game-tools">
        <button type="button" onClick={() => setIsConfirmingReset(true)}>
          {t('reset.button')}
        </button>
      </div>
      {openBuilding === null && errorMessage}

      {openBuilding !== null && (
        <GameWindow title={t(`base.building.${openBuilding}.name`)} hint={t(`base.building.${openBuilding}.text`)} onDismiss={() => setOpenBuilding(null)}>
          {guideStep !== null && speaksInWindowOf(guideStep, openBuilding) && guide}
          {errorMessage}
          {openBuilding === 'headquarters' && <HeadquartersPanel bases={base.bases} baseLimit={base.baseLimit} onClaim={claimBase} />}
          {openBuilding === 'controlTower' && (
            <ControlTowerPanel
              squadron={base.squadron}
              weather={base.headquarters.weather}
              offers={base.headquarters.offers}
              flights={flights}
              rests={rests}
              away={away}
              recruitment={base.roster.recruitment}
              events={base.events}
              busy={busy}
              unavailable={unavailable}
              onLaunch={(missionId, pilotIds, aircraftIds, fuel, ammunition) => void launch(missionId, pilotIds, aircraftIds, fuel, ammunition)}
              onReceive={(missionId) => void receive(missionId)}
              onRest={(pilotId) => void order(restPilot(pilotId))}
              onRecruit={() => void order(recruitPilot())}
              recipients={base.recipients}
              onGivePilot={(pilotId, recipientBaseId) => void order(givePilot(recipientBaseId, pilotId))}
            />
          )}
          {openBuilding === 'workshop' && (
            <WorkshopPanel
              workshop={base.workshop}
              jobs={jobs}
              onProduce={(part, withMechanic) => void order(produce(part, withMechanic))}
              upgrade={upgradeOf('workshop')}
              commandPoints={base.resources.commandPoints}
              onUpgrade={(upgrade) => void order(buyUpgrade(upgrade))}
            />
          )}
          {openBuilding === 'warehouse' && (
            <WarehousePanel
              resources={base.resources}
              warehouse={base.warehouse}
              onBuy={(stock, quantity) => void order(buy(stock, quantity))}
              upgrade={upgradeOf('warehouse')}
              onUpgrade={(upgrade) => void order(buyUpgrade(upgrade))}
              recipients={base.recipients}
              onGive={(recipientBaseId, resource, quantity) => void order(giveResource(recipientBaseId, resource, quantity))}
            />
          )}
          {openBuilding === 'hangar' && (
            <HangarPanel
              squadron={base.squadron}
              hangarAircraft={hangarAircraft}
              busyAircraftIds={busy.aircraftIds}
              unavailable={unavailable}
              away={away}
              guests={guests}
              flightSeconds={base.stationings.flightSeconds}
              onStation={(destinationBaseId, pilotId, aircraftId, fuel, ammunition) => void station(destinationBaseId, pilotId, aircraftId, fuel, ammunition)}
              onRecall={(aircraftId) => void order(recallStationing(aircraftId))}
              onInspect={(aircraftId) => void order(inspectAircraft(aircraftId))}
              onRepair={(aircraftId) => void order(repairAircraft(aircraftId))}
              upgrade={upgradeOf('hangar')}
              commandPoints={base.resources.commandPoints}
              onUpgrade={(upgrade) => void order(buyUpgrade(upgrade))}
              recipients={base.recipients}
              onGiveAircraft={(aircraftId, recipientBaseId) => void order(giveAircraft(recipientBaseId, aircraftId))}
            />
          )}
        </GameWindow>
      )}

      {duel !== undefined && duel.alert.kind === 'dogfight' && (
        <DogfightWindow
          alert={duel.alert}
          onStart={(alertId) => order(startAlert(alertId))}
          onPlay={(alertId, maneuver) => order(playAlert(alertId, maneuver))}
          onClose={() => setDuelAlertId(null)}
        />
      )}
      {MissionWindow !== undefined && duel !== undefined && duel.alert.kind === 'cockpit' && (
        <MissionWindow
          alert={duel.alert}
          onStart={(alertId) => order(startAlert(alertId))}
          onFinish={(alertId, outcome) => order(finishAlert(alertId, outcome))}
          onClose={() => setDuelAlertId(null)}
        />
      )}
      {duelCrew !== undefined && duel !== undefined && duel.alert.kind === 'cockpit' && duel.flight.type === 'fighterCombat' && (
        <CockpitCombatWindow
          alert={duel.alert}
          maneuverability={duelCrew.aircraft.model.maneuverability}
          accuracy={duelCrew.pilot.effectiveAccuracy}
          onStart={(alertId) => order(startAlert(alertId))}
          onFinish={(alertId, outcome) => order(finishAlert(alertId, outcome))}
          onClose={() => setDuelAlertId(null)}
        />
      )}

      {isConfirmingReset && <ResetConfirm onConfirm={() => void startOver()} onCancel={() => setIsConfirmingReset(false)} />}

      {guideStep === 'welcome' && <GuideWelcome onBegin={() => setGuideStatus('running')} onSkip={() => setGuideStatus('over')} />}

      {base.battle.status !== 'ongoing' && <BattleOver battle={base.battle} onRestart={() => void order(restartBattle())} />}
    </section>
  )
}

export default BaseScreen
