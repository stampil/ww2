import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { damageLevelOf } from '../three/damageStages'
import AircraftPicture from './AircraftPicture'
import { formatDuration } from './formatDuration'
import Gauge from './Gauge'
import GiveTo from './GiveTo'
import Icon from './Icon'
import OrderButton from './OrderButton'
import Pane from './Pane'
import { inspectShortage, rebuildAircraftShortage, repairShortage } from './shortages'
import type { AwayAircraft, Base, GuestAircraft, HangarAircraft, Part, Recipient, Squadron, UpgradeInfo, UpgradeName, Wreck } from './useBase'
import UpgradeCard from './UpgradeCard'

const PARTS: Part[] = ['engine', 'wings', 'fuselage', 'armament']

type Props = {
  squadron: Squadron
  hangarAircraft: HangarAircraft[]
  /** The destroyed aircraft, which keep their place and can be rebuilt. */
  wrecks: Wreck[]
  busyAircraftIds: number[]
  /** The aircraft of the base stationed at another, and those of other bases stationed here. */
  away: AwayAircraft[]
  guests: GuestAircraft[]
  /** The mechanics and the spare parts that inspecting and repairing take. */
  workshop: Base['workshop']
  onRecall: (aircraftId: number) => Promise<string | null>
  onInspect: (aircraftId: number) => Promise<string | null>
  onRepair: (aircraftId: number) => Promise<string | null>
  onRebuild: (wreckId: number) => Promise<string | null>
  upgrade: UpgradeInfo
  commandPoints: number
  onUpgrade: (upgrade: UpgradeName) => Promise<string | null>
  /** The bases a gift can go to; an aircraft goes to the player's own only. */
  recipients: Recipient[]
  onGiveAircraft: (aircraftId: number, recipientBaseId: number) => Promise<string | null>
}

/** The aircraft of the squadron in a picture, which turns to 3D once the aircraft is inspected, with their modules; one back damaged is inspected to show its damage, then repaired, if a mechanic and the spare parts are there. The aircraft stationed at another base can be recalled, and those stationed here are listed. */
function HangarPanel({ squadron, hangarAircraft, wrecks, busyAircraftIds, away, guests, workshop, onRecall, onInspect, onRepair, onRebuild, upgrade, commandPoints, onUpgrade, recipients, onGiveAircraft }: Props) {
  const { t } = useTranslation()
  const ownRecipients = recipients.filter((recipient) => recipient.kinship === 'own')
  const [inspectedIds, setInspectedIds] = useState<number[]>([])

  async function inspect(aircraftId: number): Promise<string | null> {
    const refusal = await onInspect(aircraftId)
    if (refusal === null) {
      setInspectedIds((current) => (current.includes(aircraftId) ? current : [...current, aircraftId]))
    }
    return refusal
  }

  return (
    <>
      <Pane title={t('squadron.aircraft')}>
        <ul className="cards">
          {wrecks.map((wreck) => (
            <li key={`wreck-${wreck.wreckId}`} className="card" data-wreck="true">
              <strong>
                {wreck.model.name} {t('squadron.aircraftNumber', { number: wreck.number })}
              </strong>
              <span className="status on-fire">
                <Icon name="fire" />
                {t('base.hangar.destroyed')}
              </span>
              <span>{t('squadron.serviceDays', { count: wreck.serviceDays })}</span>
              {wreck.rebuildSeconds === null ? (
                <div className="card-actions">
                  <OrderButton onOrder={() => onRebuild(wreck.wreckId)} reasonKey={rebuildAircraftShortage(workshop)}>
                    <Icon name="repair" />
                    {t('base.hangar.rebuild', { time: formatDuration(wreck.rebuildDurationSeconds) })}
                  </OrderButton>
                </div>
              ) : (
                <span className="status">
                  <Icon name="repair" />
                  {t('base.hangar.rebuilding', { time: formatDuration(wreck.rebuildSeconds) })}
                </span>
              )}
            </li>
          ))}
          {squadron.aircraft.map((aircraft) => {
            const state = hangarAircraft.find((candidate) => candidate.aircraftId === aircraft.id)!
            const isFlying = busyAircraftIds.includes(aircraft.id)
            const awayAircraft = away.find((candidate) => candidate.aircraftId === aircraft.id)
            const destroyedModules = state.destroyedModules
            const isGrounded = state.needsInspection || state.inspectionSeconds !== null || state.repairSeconds !== null || state.fireSeconds !== null || (destroyedModules ?? []).length > 0

            return (
              <li key={aircraft.id} className="card">
                <AircraftPicture isFlying={isFlying} isInteractive={inspectedIds.includes(aircraft.id)} damageLevel={damageLevelOf(aircraft.durability, aircraft.model.durability)} tailNumber={aircraft.number} livery={aircraft.livery} />
                <strong>
                  {aircraft.model.name} {t('squadron.aircraftNumber', { number: aircraft.number })}
                </strong>
                <span>{t(`squadron.categories.${aircraft.model.category}`)}</span>
                <span>{t('squadron.serviceDays', { count: aircraft.serviceDays })}</span>
                {isFlying && awayAircraft === undefined && <span className="status">{t('base.mission.inFlight')}</span>}
                {awayAircraft !== undefined && (
                  <>
                    <span className="status">
                      <Icon name="site" />
                      {t(`stationing.phase.${awayAircraft.phase}`, { site: t(`world.site.${awayAircraft.site}`), time: formatDuration(awayAircraft.remainingSeconds) })}
                    </span>
                    {awayAircraft.phase === 'stationed' && (
                      <div className="card-actions">
                        <OrderButton onOrder={() => onRecall(aircraft.id)}>{t('stationing.recall', { time: formatDuration(awayAircraft.flightSeconds) })}</OrderButton>
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
                    <OrderButton onOrder={() => inspect(aircraft.id)} reasonKey={inspectShortage(workshop)}>
                      <Icon name="reconnaissance" />
                      {t('base.hangar.inspect', { time: formatDuration(state.inspectionDurationSeconds) })}
                    </OrderButton>
                  </div>
                )}
                {state.repairDurationSeconds !== null && state.repairDurationSeconds > 0 && state.repairSeconds === null && (
                  <div className="card-actions">
                    <OrderButton disabled={isFlying} onOrder={() => onRepair(aircraft.id)} reasonKey={isFlying ? null : repairShortage(workshop, destroyedModules ?? [])}>
                      <Icon name="repair" />
                      {t('base.hangar.repair', { time: formatDuration(state.repairDurationSeconds) })}
                    </OrderButton>
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
                {guest.kinship === 'own' && guest.phase === 'stationed' && (
                  <div className="card-actions">
                    <OrderButton onOrder={() => onRecall(guest.aircraftId)}>{t('stationing.recall', { time: formatDuration(guest.flightSeconds) })}</OrderButton>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Pane>
      )}
    </>
  )
}

export default HangarPanel
