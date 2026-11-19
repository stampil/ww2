import { useTranslation } from 'react-i18next'
import { damageLevelOf } from '../three/damageStages'
import AircraftPicture from './AircraftPicture'
import { formatDuration } from './formatDuration'
import type { BusyCrews } from './flights'
import Gauge from './Gauge'
import GiveTo from './GiveTo'
import Icon from './Icon'
import Pane from './Pane'
import StationingForm from './StationingForm'
import type { AwayAircraft, GuestAircraft, HangarAircraft, Part, Recipient, Squadron, UpgradeInfo, UpgradeName } from './useBase'
import UpgradeCard from './UpgradeCard'

const PARTS: Part[] = ['engine', 'wings', 'fuselage', 'armament']

type Props = {
  squadron: Squadron
  hangarAircraft: HangarAircraft[]
  busyAircraftIds: number[]
  unavailable: BusyCrews
  /** The aircraft of the base stationed at another, and those of other bases stationed here. */
  away: AwayAircraft[]
  guests: GuestAircraft[]
  flightSeconds: number
  onStation: (destinationBaseId: number, pilotId: number, aircraftId: number, fuel: number, ammunition: number) => void
  onRecall: (aircraftId: number) => void
  onInspect: (aircraftId: number) => void
  onRepair: (aircraftId: number) => void
  upgrade: UpgradeInfo
  commandPoints: number
  onUpgrade: (upgrade: UpgradeName) => void
  /** The bases a gift can go to; an aircraft goes to the player's own only. */
  recipients: Recipient[]
  onGiveAircraft: (aircraftId: number, recipientBaseId: number) => void
}

/** The aircraft of the squadron in 3D, on the ground or in flight, with their modules; one back damaged is inspected to show its damage, then repaired, if a mechanic and the spare parts are there. An aircraft can be stationed at another base, and those stationed here are listed. */
function HangarPanel({ squadron, hangarAircraft, busyAircraftIds, unavailable, away, guests, flightSeconds, onStation, onRecall, onInspect, onRepair, upgrade, commandPoints, onUpgrade, recipients, onGiveAircraft }: Props) {
  const { t } = useTranslation()
  const ownRecipients = recipients.filter((recipient) => recipient.kinship === 'own')

  return (
    <>
      <Pane title={t('squadron.aircraft')}>
        <ul className="cards">
          {squadron.aircraft.map((aircraft) => {
            const state = hangarAircraft.find((candidate) => candidate.aircraftId === aircraft.id)!
            const isFlying = busyAircraftIds.includes(aircraft.id)
            const awayAircraft = away.find((candidate) => candidate.aircraftId === aircraft.id)
            const destroyedModules = state.destroyedModules
            const isGrounded = state.needsInspection || state.inspectionSeconds !== null || state.repairSeconds !== null || state.fireSeconds !== null || (destroyedModules ?? []).length > 0

            return (
              <li key={aircraft.id} className="card">
                <AircraftPicture isFlying={isFlying} damageLevel={damageLevelOf(aircraft.durability, aircraft.model.durability)} aircraftId={aircraft.id} tailNumber={aircraft.number} />
                <strong>
                  {aircraft.model.name} {t('squadron.aircraftNumber', { number: aircraft.number })}
                </strong>
                <span>{t(`squadron.categories.${aircraft.model.category}`)}</span>
                {isFlying && awayAircraft === undefined && <span className="status">{t('base.mission.inFlight')}</span>}
                {awayAircraft !== undefined && (
                  <>
                    <span className="status">
                      <Icon name="site" />
                      {t(`stationing.phase.${awayAircraft.phase}`, { site: t(`world.site.${awayAircraft.site}`), time: formatDuration(awayAircraft.remainingSeconds) })}
                    </span>
                    {awayAircraft.phase === 'stationed' && (
                      <div className="card-actions">
                        <button type="button" onClick={() => onRecall(aircraft.id)}>
                          {t('stationing.recall')}
                        </button>
                      </div>
                    )}
                  </>
                )}
                {state.inspectionSeconds !== null && (
                  <span className="status">
                    <Icon name="reconnaissance" />
                    {t('base.hangar.inspecting', { time: formatDuration(state.inspectionSeconds) })}
                  </span>
                )}
                {state.repairSeconds !== null && (
                  <span className="status">
                    <Icon name="repair" />
                    {t('base.hangar.repairing', { time: formatDuration(state.repairSeconds) })}
                  </span>
                )}
                {state.fireSeconds !== null && (
                  <span className="status on-fire">
                    <Icon name="fire" />
                    {t('base.hangar.onFire', { time: formatDuration(state.fireSeconds) })}
                  </span>
                )}
                <Gauge label={t('squadron.durability')} value={aircraft.durability} max={aircraft.model.durability} higherIsBetter />
                <ul className="stats">
                  <li title={t('squadron.maneuverability')}>
                    <Icon name="aircraft" />
                    {aircraft.model.maneuverability}
                  </li>
                  <li title={t('squadron.fuel')}>
                    <Icon name="fuel" />
                    {aircraft.model.fuelCapacity}
                  </li>
                  <li title={t('squadron.ammunition')}>
                    <Icon name="ammunition" />
                    {aircraft.model.ammunitionCapacity}
                  </li>
                </ul>
                {destroyedModules === null ? (
                  <p className="status">{t('base.hangar.unknownDamage')}</p>
                ) : (
                  <ul className="modules" aria-label={t('base.hangar.modules')}>
                    {PARTS.map((part) => {
                      const isDestroyed = destroyedModules.includes(part)
                      return (
                        <li key={part} data-destroyed={isDestroyed}>
                          <Icon name={part} />
                          {t(isDestroyed ? 'base.hangar.moduleDestroyed' : 'base.hangar.moduleIntact', { part: t(`base.parts.${part}`) })}
                        </li>
                      )
                    })}
                  </ul>
                )}
                {state.needsInspection && state.inspectionSeconds === null && (
                  <div className="card-actions">
                    <button type="button" onClick={() => onInspect(aircraft.id)}>
                      <Icon name="reconnaissance" />
                      {t('base.hangar.inspect', { time: formatDuration(state.inspectionDurationSeconds) })}
                    </button>
                  </div>
                )}
                {state.repairDurationSeconds !== null && state.repairDurationSeconds > 0 && state.repairSeconds === null && (
                  <div className="card-actions">
                    <button type="button" disabled={isFlying} onClick={() => onRepair(aircraft.id)}>
                      <Icon name="repair" />
                      {t('base.hangar.repair', { time: formatDuration(state.repairDurationSeconds) })}
                    </button>
                  </div>
                )}
                {ownRecipients.length > 0 && (
                  <div className="card-actions">
                    <GiveTo recipients={ownRecipients} isDisabled={isFlying || isGrounded} onGive={(recipientBaseId) => onGiveAircraft(aircraft.id, recipientBaseId)} />
                  </div>
                )}
              </li>
            )
          })}
          <UpgradeCard info={upgrade} commandPoints={commandPoints} onBuy={onUpgrade} />
        </ul>
      </Pane>
      {recipients.length > 0 && <StationingForm squadron={squadron} unavailable={unavailable} recipients={recipients} flightSeconds={flightSeconds} onStation={onStation} />}
      {guests.length > 0 && (
        <Pane title={t('stationing.guests')}>
          <ul className="reports">
            {guests.map((guest) => (
              <li key={guest.aircraftId}>
                <strong>
                  {guest.aircraftName} {t('squadron.aircraftNumber', { number: guest.aircraftNumber })}
                </strong>
                <span>
                  {guest.pilotName} — {t(`gift.recipient.${guest.kinship}`, { site: t(`world.site.${guest.site}`), holder: guest.holder })}
                </span>
                <span>{t(`stationing.guestPhase.${guest.phase}`, { time: formatDuration(guest.remainingSeconds) })}</span>
              </li>
            ))}
          </ul>
        </Pane>
      )}
    </>
  )
}

export default HangarPanel
