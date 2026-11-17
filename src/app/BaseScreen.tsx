import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TERRAIN_PLANS } from '../plans/terrainPlan'
import type { BuildingName } from '../plans/terrainPlan'
import BaseChoice from './BaseChoice'
import BaseMap from './BaseMap'
import type { Departure, MapAlert, ParkedAircraft, StandStatus } from './BaseMap'
import BattleOver from './BattleOver'
import { busyCrews, unavailableCrews } from './flights'
import GameWindow from './GameWindow'
import HangarPanel from './HangarPanel'
import HeadquartersPanel from './HeadquartersPanel'
import Hud from './Hud'
import type { Player } from './useAccount'
import { useAircraftSprite } from './useAircraftSprite'
import { useBase } from './useBase'
import type { Aircraft, HangarAircraft, UpgradeName } from './useBase'
import WarehousePanel from './WarehousePanel'
import WorkshopPanel from './WorkshopPanel'

const DEPARTURE_GAP_MILLISECONDS = 450

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
    gameTime,
    buy,
    produce,
    launchMission,
    receiveSquadron,
    inspectAircraft,
    repairAircraft,
    restPilot,
    recruitPilot,
    buyUpgrade,
    restartBattle,
    claimBase,
  } = useBase(player)
  const aircraftSprite = useAircraftSprite()
  const [openBuilding, setOpenBuilding] = useState<BuildingName | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [departures, setDepartures] = useState<Departure[]>([])
  const removeDeparture = useCallback((aircraftId: number) => {
    setDepartures((current) => current.filter((departure) => departure.aircraftId !== aircraftId))
  }, [])

  if (hasNoBase) {
    return <BaseChoice onClaim={claimBase} />
  }

  if (base === null || gameTime === null) {
    return null
  }

  async function order(sending: Promise<string | null>): Promise<void> {
    setErrorCode(await sending)
  }

  // Once the orders are given the window closes, to show the squadron taking off one aircraft after the other.
  async function launch(missionId: number, pilotIds: number[], aircraftIds: number[], fuel: number, ammunition: number): Promise<void> {
    const departing = parkedAircraft.filter((aircraft) => aircraftIds.includes(aircraft.id))
    const launchErrorCode = await launchMission(missionId, pilotIds, aircraftIds, fuel, ammunition)
    setErrorCode(launchErrorCode)
    if (launchErrorCode === null) {
      setOpenBuilding(null)
      const leaving = departing.map((aircraft, place) => ({ aircraftId: aircraft.id, stand: aircraft.stand, delayMilliseconds: place * DEPARTURE_GAP_MILLISECONDS }))
      setDepartures((current) => [...current, ...leaving])
    }
  }

  const plan = TERRAIN_PLANS[base.terrainPlan]
  const busy = busyCrews(flights)
  const unavailable = unavailableCrews(busy, rests, hangarAircraft)
  const upgradeOf = (building: UpgradeName) => base.upgrades.find((candidate) => candidate.upgrade === building)!
  const servicedAircraftIds = hangarAircraft.filter((state) => state.inspectionSeconds !== null || state.repairSeconds !== null).map((state) => state.aircraftId)

  const parkedAircraft: ParkedAircraft[] = []
  for (let place = 0; place < base.squadron.aircraft.length; place += 1) {
    const aircraft = base.squadron.aircraft[place]
    const stand = plan.stands[place]
    if (stand !== undefined && !busy.aircraftIds.includes(aircraft.id)) {
      const state = hangarAircraft.find((candidate) => candidate.aircraftId === aircraft.id)!
      parkedAircraft.push({ id: aircraft.id, stand, status: standStatusOf(state, aircraft) })
    }
  }

  const alerts: MapAlert[] = []
  if (flights.some((flight) => flight.remainingSeconds === 0)) {
    alerts.push({ kind: 'mission', building: 'headquarters', label: t('base.alert') })
  }
  if (hangarAircraft.some((state) => state.fireSeconds !== null)) {
    alerts.push({ kind: 'fire', building: 'hangar', label: t('base.fireAlert') })
  }

  const errorMessage = errorCode !== null && (
    <p className="game-message" role="alert">
      {t(`base.errors.${errorCode}`)}
    </p>
  )

  return (
    <section className="base game" aria-label={t('base.title')}>
      <h2 className="visually-hidden">{t('base.title')}</h2>
      <div className="stage">
        <Hud gameTime={gameTime} base={base} />
        <BaseMap
          plan={plan}
          servicedAircraftIds={servicedAircraftIds}
          parkedAircraft={parkedAircraft}
          aircraftSprite={aircraftSprite}
          departures={departures}
          onDeparted={removeDeparture}
          alerts={alerts}
          openBuilding={openBuilding}
          onSelect={setOpenBuilding}
        />
      </div>

      {openBuilding === null && errorMessage}

      {openBuilding !== null && (
        <GameWindow title={t(`base.building.${openBuilding}.name`)} hint={t(`base.building.${openBuilding}.text`)} onDismiss={() => setOpenBuilding(null)}>
          {errorMessage}
          {openBuilding === 'headquarters' && (
            <HeadquartersPanel
              squadron={base.squadron}
              weather={base.headquarters.weather}
              offers={base.headquarters.offers}
              flights={flights}
              rests={rests}
              recruitment={base.roster.recruitment}
              events={base.events}
              busy={busy}
              unavailable={unavailable}
              onLaunch={(missionId, pilotIds, aircraftIds, fuel, ammunition) => void launch(missionId, pilotIds, aircraftIds, fuel, ammunition)}
              onReceive={(missionId) => void order(receiveSquadron(missionId))}
              onRest={(pilotId) => void order(restPilot(pilotId))}
              onRecruit={() => void order(recruitPilot())}
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
            />
          )}
          {openBuilding === 'hangar' && (
            <HangarPanel
              squadron={base.squadron}
              hangarAircraft={hangarAircraft}
              busyAircraftIds={busy.aircraftIds}
              sprite={aircraftSprite}
              onInspect={(aircraftId) => void order(inspectAircraft(aircraftId))}
              onRepair={(aircraftId) => void order(repairAircraft(aircraftId))}
              upgrade={upgradeOf('hangar')}
              commandPoints={base.resources.commandPoints}
              onUpgrade={(upgrade) => void order(buyUpgrade(upgrade))}
            />
          )}
        </GameWindow>
      )}

      {base.battle.status !== 'ongoing' && <BattleOver battle={base.battle} onRestart={() => void order(restartBattle())} />}
    </section>
  )
}

export default BaseScreen
