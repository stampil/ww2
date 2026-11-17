import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TERRAIN_PLANS } from '../plans/terrainPlan'
import type { BuildingName } from '../plans/terrainPlan'
import BaseMap from './BaseMap'
import AlertButton from './AlertButton'
import { busyCrews, unavailableCrews } from './flights'
import GameClock from './GameClock'
import HangarPanel from './HangarPanel'
import HeadquartersPanel from './HeadquartersPanel'
import type { Player } from './useAccount'
import { useBase } from './useBase'
import WarehousePanel from './WarehousePanel'
import WorkshopPanel from './WorkshopPanel'

const RESOURCES = ['supplies', 'fuel', 'ammunition', 'materials', 'commandPoints'] as const

/** The base of the player who is signed in: a band of the game clock and the resources, the airfield, and the panel of the building opened on it. */
function BaseScreen({ player }: { player: Player }) {
  const { t } = useTranslation()
  const { base, jobs, flights, hangarAircraft, rests, gameTime, buy, produce, launchMission, receiveSquadron, repairAircraft, restPilot, recruitPilot } = useBase(player)
  const [openBuilding, setOpenBuilding] = useState<BuildingName | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)

  if (base === null || gameTime === null) {
    return null
  }

  async function order(sending: Promise<string | null>): Promise<void> {
    setErrorCode(await sending)
  }

  const busy = busyCrews(flights)
  const unavailable = unavailableCrews(busy, rests, hangarAircraft)
  const hasLandedFlight = flights.some((flight) => flight.remainingSeconds === 0)
  const hasBurningAircraft = hangarAircraft.some((state) => state.fireSeconds !== null)
  const repairingAircraftIds = hangarAircraft.filter((state) => state.repairSeconds !== null).map((state) => state.aircraftId)

  function toggle(building: BuildingName): void {
    setOpenBuilding(openBuilding === building ? null : building)
  }

  return (
    <section className="base" aria-label={t('base.title')}>
      <h2>{t('base.title')}</h2>
      <div className="base-band">
        <GameClock gameTime={gameTime} />
        {hasLandedFlight && <AlertButton label={t('base.alert')} onOpen={() => setOpenBuilding('headquarters')} />}
        {hasBurningAircraft && <AlertButton label={t('base.fireAlert')} onOpen={() => setOpenBuilding('hangar')} />}
        <ul className="resources">
          {RESOURCES.map((resource) => (
            <li key={resource}>
              <span>{t(`base.resources.${resource}`)}</span>
              <strong>{base.resources[resource]}</strong>
            </li>
          ))}
        </ul>
      </div>

      <BaseMap plan={TERRAIN_PLANS[base.terrainPlan]} repairingAircraftIds={repairingAircraftIds} openBuilding={openBuilding} onSelect={toggle} />

      {errorCode !== null && (
        <p className="account-error" role="alert">
          {t(`base.errors.${errorCode}`)}
        </p>
      )}

      {openBuilding !== null && (
        <section className="base-detail" aria-label={t(`base.building.${openBuilding}.name`)}>
          <h3>{t(`base.building.${openBuilding}.name`)}</h3>
          <p className="squadron-hint">{t(`base.building.${openBuilding}.text`)}</p>
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
              onLaunch={(missionId, pilotIds, aircraftIds, fuel, ammunition) =>
                void order(launchMission(missionId, pilotIds, aircraftIds, fuel, ammunition))
              }
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
            />
          )}
          {openBuilding === 'warehouse' && (
            <WarehousePanel
              resources={base.resources}
              warehouse={base.warehouse}
              onBuy={(stock, quantity) => void order(buy(stock, quantity))}
            />
          )}
          {openBuilding === 'hangar' && (
            <HangarPanel
              squadron={base.squadron}
              hangarAircraft={hangarAircraft}
              busyAircraftIds={busy.aircraftIds}
              onRepair={(aircraftId) => void order(repairAircraft(aircraftId))}
            />
          )}
        </section>
      )}
    </section>
  )
}

export default BaseScreen
