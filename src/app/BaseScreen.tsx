import { useCallback, useEffect, useRef, useState } from 'react'
import type { ComponentType } from 'react'
import { useTranslation } from 'react-i18next'
import { TERRAIN_PLANS } from '../plans/terrainPlan'
import type { BuildingName } from '../plans/terrainPlan'
import BaseChoice from './BaseChoice'
import BaseMap from './BaseMap'
import { ClanContext } from './ClanContext'
import type { MapAlert, ParkedAircraft, StandStatus } from './BaseMap'
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
import FlakWindow from './FlakWindow'
import GuideWelcome from './GuideWelcome'
import MilestonePopins from './MilestonePopins'
import HangarPanel from './HangarPanel'
import HeadquartersPanel from './HeadquartersPanel'
import Hud from './Hud'
import JournalBook from './JournalBook'
import MissionToasts from './MissionToasts'
import ReconnaissanceWindow from './ReconnaissanceWindow'
import { prefersReducedMotion } from './reducedMotion'
import type { Player } from './useAccount'
import { useAircraftSprite } from './useAircraftSprite'
import RebuildNotice from './RebuildNotice'
import ResetConfirm from './ResetConfirm'
import SquadronRoster from './SquadronRoster'
import { squadronAircraft, useBase } from './useBase'
import type { Aircraft, AttackKind, Cargo, HangarAircraft, MissionType, UpgradeName } from './useBase'
import { useGuideStatus } from './useGuideStatus'
import WarehousePanel from './WarehousePanel'
import WorkshopPanel from './WorkshopPanel'

// The missions whose mini-game is flown from above, with the window that plays it.
const GROUND_RUN_WINDOWS: Partial<Record<MissionType, ComponentType<GroundRunProps>>> = {
  groundAttack: GroundAttackWindow,
  raid: GroundAttackWindow,
  reconnaissance: ReconnaissanceWindow,
}

// The missions whose mini-game is a dogfight flown from the cockpit: an air combat, and the combats of a capture, one for each aircraft that defends the camp.
const COCKPIT_COMBAT_TYPES: MissionType[] = ['fighterCombat', 'campCapture']

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
    hangarWrecks,
    rests,
    away,
    guests,
    gameTime,
    buy,
    produce,
    launchMission,
    attackCamp,
    rebuild,
    rebuildAircraft,
    recruitMechanic,
    startAlert,
    playAlert,
    finishAlert,
    finishFlak,
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
  } = useBase(player)
  const aircraftSprite = useAircraftSprite()
  const [openBuilding, setOpenBuilding] = useState<BuildingName | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [departures, setDepartures] = useState<Departure[]>([])
  const [landingIds, setLandingIds] = useState<number[]>([])
  const [emergingIds, setEmergingIds] = useState<number[]>([])
  const [refuelingIds, setRefuelingIds] = useState<number[]>([])
  const landingIdsRef = useRef<number[]>([])
  const [guideStatus, setGuideStatus] = useGuideStatus(player.id)
  const [isConfirmingReset, setIsConfirmingReset] = useState(false)
  const [isJournalOpen, setIsJournalOpen] = useState(false)
  const [isRosterOpen, setIsRosterOpen] = useState(false)
  const [duelAlertId, setDuelAlertId] = useState<number | null>(null)
  const removeDeparture = useCallback((aircraftId: number) => {
    setDepartures((current) => current.filter((departure) => departure.aircraftId !== aircraftId))
  }, [])
  landingIdsRef.current = landingIds
  const removeRefueling = useCallback((aircraftId: number) => {
    setRefuelingIds((current) => current.filter((refuelingId) => refuelingId !== aircraftId))
  }, [])
  const removeLanding = useCallback((aircraftId: number) => {
    if (landingIdsRef.current.includes(aircraftId)) {
      setRefuelingIds((current) => [...current, aircraftId])
    }
    setLandingIds((current) => current.filter((landingId) => landingId !== aircraftId))
    setEmergingIds((current) => current.filter((emergingId) => emergingId !== aircraftId))
  }, [])
  const busy = busyCrews(flights, away)
  const { stands, emergedIds } = useStands(base?.squadron.aircraft.map((aircraft) => aircraft.id) ?? [], busy.aircraftIds, base === null ? 0 : TERRAIN_PLANS[base.terrainPlan].stands.length)
  const canAnimate = aircraftSprite !== null && !prefersReducedMotion()
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

  // The base is wiped and founded again; the guide of the first day comes back with it. The window of the question stays until the API has answered.
  async function startOver(): Promise<string | null> {
    setOpenBuilding(null)
    setDuelAlertId(null)
    setDepartures([])
    setLandingIds([])
    setEmergingIds([])
    const resetErrorCode = await resetGame()
    if (resetErrorCode === null) {
      setIsConfirmingReset(false)
      setGuideStatus('new')
    }
    return resetErrorCode
  }

  // The orders below return their error code to the button that gave them, which shows it.
  // Once the orders are given the window closes, to show the squadron taking off, in groups of three.
  async function launch(missionId: number, pilotIds: number[], aircraftIds: number[], fuel: number, ammunition: number): Promise<string | null> {
    const departing = parkedAircraft.filter((aircraft) => aircraftIds.includes(aircraft.id))
    const launchErrorCode = await launchMission(missionId, pilotIds, aircraftIds, fuel, ammunition)
    if (launchErrorCode === null) {
      setOpenBuilding(null)
      showDepartures(departing)
    }
    return launchErrorCode
  }

  // A raid or a capture takes off like a squadron sent on a mission.
  async function attack(targetBaseId: number, kind: AttackKind, pilotIds: number[], aircraftIds: number[]): Promise<string | null> {
    const departing = parkedAircraft.filter((aircraft) => aircraftIds.includes(aircraft.id))
    const attackErrorCode = await attackCamp(targetBaseId, kind, pilotIds, aircraftIds)
    if (attackErrorCode === null) {
      setOpenBuilding(null)
      showDepartures(departing)
    }
    return attackErrorCode
  }

  // An aircraft stationed at another base takes off like a squadron sent on a mission.
  async function station(destinationBaseId: number, pilotId: number, aircraftId: number, fuel: number, ammunition: number): Promise<string | null> {
    const departing = parkedAircraft.filter((aircraft) => aircraft.id === aircraftId)
    const stationErrorCode = await sendStationing(destinationBaseId, pilotId, aircraftId, fuel, ammunition)
    if (stationErrorCode === null) {
      setOpenBuilding(null)
      showDepartures(departing)
    }
    return stationErrorCode
  }

  // An aircraft that takes supplies to another base takes off the same way, and comes back by itself.
  async function supply(destinationBaseId: number, pilotId: number, aircraftId: number, cargo: Cargo): Promise<string | null> {
    const departing = parkedAircraft.filter((aircraft) => aircraft.id === aircraftId)
    const supplyErrorCode = await sendSupply(destinationBaseId, pilotId, aircraftId, cargo)
    if (supplyErrorCode === null) {
      setOpenBuilding(null)
      showDepartures(departing)
    }
    return supplyErrorCode
  }

  function showDepartures(departing: ParkedAircraft[]): void {
    if (aircraftSprite !== null && !prefersReducedMotion()) {
      const leaving = departing.map((aircraft) => ({ aircraftId: aircraft.id, tailNumber: aircraft.number, stand: aircraft.stand, livery: aircraft.livery }))
      setDepartures((current) => [...current, ...leaving])
    }
  }

  // The squadron is received: the window closes to show the aircraft that are left landing and taxiing to their stands.
  async function receive(missionId: number): Promise<string | null> {
    const ownAircraftIds = base?.squadron.aircraft.map((aircraft) => aircraft.id) ?? []
    const crewAircraftIds = flights
      .find((flight) => flight.id === missionId)!
      .crews.map((crew) => crew.aircraftId)
      .filter((aircraftId) => ownAircraftIds.includes(aircraftId))
    const receiveErrorCode = await receiveSquadron(missionId)
    if (receiveErrorCode === null) {
      setOpenBuilding(null)
      setIsJournalOpen(true)
      if (aircraftSprite !== null && !prefersReducedMotion()) {
        setLandingIds((current) => [...current, ...crewAircraftIds])
      }
    }
    return receiveErrorCode
  }

  const plan = TERRAIN_PLANS[base.terrainPlan]
  const unavailable = unavailableCrews(busy, rests, hangarAircraft)
  const upgradeOf = (building: UpgradeName) => base.upgrades.find((candidate) => candidate.upgrade === building)!
  const servicedAircraftIds = hangarAircraft.filter((state) => state.inspectionSeconds !== null || state.repairSeconds !== null).map((state) => state.aircraftId)
  const burningAircraftIds = hangarAircraft.filter((state) => state.fireSeconds !== null).map((state) => state.aircraftId)

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
      arrivals.push({ aircraftId: aircraft.id, tailNumber: aircraft.number, stand, damageLevel: damageLevelOf(aircraft.durability, aircraft.model.durability), livery: aircraft.livery })
    } else if (emergingIds.includes(aircraft.id) || (canAnimate && emergedIds.includes(aircraft.id))) {
      emergences.push({ aircraftId: aircraft.id, tailNumber: aircraft.number, stand, damageLevel: damageLevelOf(aircraft.durability, aircraft.model.durability), livery: aircraft.livery })
    } else {
      const state = hangarAircraft.find((candidate) => candidate.aircraftId === aircraft.id)!
      parkedAircraft.push({ id: aircraft.id, number: aircraft.number, stand, status: standStatusOf(state, aircraft), livery: aircraft.livery })
    }
  }

  const destroyedBuildings = base.camp.destroyed
  const isOpenBuildingDestroyed = openBuilding !== null && destroyedBuildings.includes(openBuilding)
  const rebuildNotice = (building: string) => <RebuildNotice cost={base.camp.rebuildCost} materials={base.resources.materials} onRebuild={() => rebuild(building)} />
  const alerts: MapAlert[] = []
  if (flights.some((flight) => flight.remainingSeconds === 0)) {
    alerts.push({ kind: 'mission', building: 'controlTower', label: t('base.alert') })
  }
  if (hangarAircraft.some((state) => state.fireSeconds !== null)) {
    alerts.push({ kind: 'fire', building: 'hangar', label: t('base.fireAlert') })
  }

  const duel = duelAlertId === null ? undefined : findAlert(flights, duelAlertId)
  const MissionWindow = duel === undefined ? undefined : duel.alert.kind === 'flak' ? FlakWindow : GROUND_RUN_WINDOWS[duel.flight.type]
  const duelCrewPlace = duel?.flight.crews.find((crew) => crew.aircraftId === duel.alert.aircraftId)
  const duelCrew =
    duelCrewPlace === undefined
      ? undefined
      : {
          pilot: base.squadron.pilots.find((pilot) => pilot.id === duelCrewPlace.pilotId)!,
          aircraft: squadronAircraft(base.squadron).find((aircraft) => aircraft.id === duelCrewPlace.aircraftId)!,
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
    <ClanContext.Provider value={base.clan}>
      <section className="base game" aria-label={t('base.title')}>
        <h2 className="visually-hidden">{t('base.title')}</h2>
        <div className="stage">
          <Hud gameTime={gameTime} base={base} onSelectBase={(selectedBaseId) => void order(selectBase(selectedBaseId))} />
          <div className="map-slot">
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
              burningAircraftIds={burningAircraftIds}
              refuelingAircraftIds={refuelingIds}
              onRefueled={removeRefueling}
              destroyedBuildings={destroyedBuildings}
              openBuilding={openBuilding}
              onSelect={setOpenBuilding}
            />
          </div>
        </div>

        <MissionToasts clan={base.clan} flights={flights} squadron={base.squadron} onOpen={setDuelAlertId} isTowerOpen={openBuilding === 'controlTower'} />
        {openBuilding === null && guide}
        {openBuilding === null && errorMessage}

        {openBuilding !== null && (
          <GameWindow title={t(`base.building.${openBuilding}.name`)} hint={t(`base.building.${openBuilding}.text`)} onDismiss={() => setOpenBuilding(null)}>
            {guideStep !== null && speaksInWindowOf(guideStep, openBuilding) && guide}
            {errorMessage}
            {isOpenBuildingDestroyed && rebuildNotice(openBuilding)}
            {!isOpenBuildingDestroyed && openBuilding === 'headquarters' && (
              <HeadquartersPanel
                bases={base.bases}
                currentSite={base.site}
                baseLimit={base.baseLimit}
                squadron={base.squadron}
                unavailable={unavailable}
                destinations={base.destinations}
                targets={base.targets}
                onAttack={attack}
                onStation={station}
                onSupply={supply}
              />
            )}
            {openBuilding === 'controlTower' && destroyedBuildings.includes('headquarters') && rebuildNotice('headquarters')}
            {openBuilding === 'controlTower' && (
              <ControlTowerPanel
                squadron={base.squadron}
                resources={base.resources}
                weather={base.headquarters.weather}
                offers={base.headquarters.offers}
                flights={flights}
                rests={rests}
                away={away}
                recruitment={base.roster.recruitment}
                busy={busy}
                unavailable={unavailable}
                onOpenJournal={() => setIsJournalOpen(true)}
                onOpenRoster={() => setIsRosterOpen(true)}
                onLaunch={launch}
                onReceive={receive}
                onRest={restPilot}
                onRecruit={recruitPilot}
                onStartOver={() => setIsConfirmingReset(true)}
                recipients={base.recipients}
                onGivePilot={(pilotId, recipientBaseId) => givePilot(recipientBaseId, pilotId)}
              />
            )}
            {!isOpenBuildingDestroyed && openBuilding === 'workshop' && (
              <WorkshopPanel
                workshop={base.workshop}
                jobs={jobs}
                materials={base.resources.materials}
                supplies={base.resources.supplies}
                onProduce={produce}
                onRecruitMechanic={recruitMechanic}
                upgrade={upgradeOf('workshop')}
                commandPoints={base.resources.commandPoints}
                onUpgrade={buyUpgrade}
              />
            )}
            {!isOpenBuildingDestroyed && openBuilding === 'warehouse' && (
              <WarehousePanel
                resources={base.resources}
                warehouse={base.warehouse}
                income={base.supplyIncome}
                onBuy={buy}
                upgrade={upgradeOf('warehouse')}
                onUpgrade={buyUpgrade}
              />
            )}
            {!isOpenBuildingDestroyed && openBuilding === 'hangar' && (
              <HangarPanel
                squadron={base.squadron}
                hangarAircraft={hangarAircraft}
                wrecks={hangarWrecks}
                busyAircraftIds={busy.aircraftIds}
                away={away}
                guests={guests}
                workshop={base.workshop}
                onRecall={recallStationing}
                onInspect={inspectAircraft}
                onRepair={repairAircraft}
                onRebuild={rebuildAircraft}
                upgrade={upgradeOf('hangar')}
                commandPoints={base.resources.commandPoints}
                onUpgrade={buyUpgrade}
                recipients={base.recipients}
                onGiveAircraft={(aircraftId, recipientBaseId) => giveAircraft(recipientBaseId, aircraftId)}
              />
            )}
          </GameWindow>
        )}

        {duelCrew !== undefined && duel !== undefined && duel.alert.kind === 'dogfight' && (
          <DogfightWindow
            alert={duel.alert}
            livery={duelCrew.aircraft.livery}
            onStart={(alertId) => order(startAlert(alertId))}
            onPlay={(alertId, maneuver) => order(playAlert(alertId, maneuver))}
            onClose={() => setDuelAlertId(null)}
          />
        )}
        {MissionWindow !== undefined && duelCrew !== undefined && duel !== undefined && (duel.alert.kind === 'cockpit' || duel.alert.kind === 'flak') && (
          <MissionWindow
            alert={duel.alert}
            clan={base.clan}
            livery={duelCrew.aircraft.livery}
            windSpeed={duel.flight.windSpeed}
            onStart={(alertId) => order(startAlert(alertId))}
            onFinish={(alertId, end) => order(duel.alert.kind === 'flak' ? finishFlak(alertId, end.hits) : finishAlert(alertId, end.outcome, end.roadsideDestroyed, end.extraPhotos))}
            onClose={() => setDuelAlertId(null)}
          />
        )}
        {duelCrew !== undefined && duel !== undefined && duel.alert.kind === 'cockpit' && COCKPIT_COMBAT_TYPES.includes(duel.flight.type) && (
          <CockpitCombatWindow
            alert={duel.alert}
            livery={duelCrew.aircraft.livery}
            maneuverability={duelCrew.aircraft.model.maneuverability}
            accuracy={duelCrew.pilot.effectiveAccuracy}
            risk={duel.flight.risk}
            onStart={(alertId) => order(startAlert(alertId))}
            onFinish={(alertId, outcome) => order(finishAlert(alertId, outcome))}
            onClose={() => setDuelAlertId(null)}
          />
        )}

        {isJournalOpen && <JournalBook site={base.site} onDismiss={() => setIsJournalOpen(false)} />}

        <MilestonePopins key={base.baseId} events={base.events} />

        {isRosterOpen && <SquadronRoster pilots={base.squadron.pilots} fallen={base.roster.fallen} onDismiss={() => setIsRosterOpen(false)} />}

        {isConfirmingReset && <ResetConfirm onConfirm={startOver} onCancel={() => setIsConfirmingReset(false)} />}

        {guideStep === 'welcome' && <GuideWelcome onBegin={() => setGuideStatus('running')} onSkip={() => setGuideStatus('over')} />}

      </section>
    </ClanContext.Provider>
  )
}

export default BaseScreen
