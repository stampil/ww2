import { useTranslation } from 'react-i18next'
import { damageLevelOf } from '../three/damageStages'
import AircraftPicture from './AircraftPicture'
import { formatDuration } from './formatDuration'
import Gauge from './Gauge'
import Icon from './Icon'
import Pane from './Pane'
import type { HangarAircraft, Part, Squadron, UpgradeInfo, UpgradeName } from './useBase'
import UpgradeCard from './UpgradeCard'

const PARTS: Part[] = ['engine', 'wings', 'fuselage', 'armament']

type Props = {
  squadron: Squadron
  hangarAircraft: HangarAircraft[]
  busyAircraftIds: number[]
  onInspect: (aircraftId: number) => void
  onRepair: (aircraftId: number) => void
  upgrade: UpgradeInfo
  commandPoints: number
  onUpgrade: (upgrade: UpgradeName) => void
}

/** The aircraft of the squadron in 3D, on the ground or in flight, with their modules; one back damaged is inspected to show its damage, then repaired, if a mechanic and the spare parts are there. */
function HangarPanel({ squadron, hangarAircraft, busyAircraftIds, onInspect, onRepair, upgrade, commandPoints, onUpgrade }: Props) {
  const { t } = useTranslation()

  return (
    <Pane title={t('squadron.aircraft')}>
      <ul className="cards">
        {squadron.aircraft.map((aircraft) => {
          const state = hangarAircraft.find((candidate) => candidate.aircraftId === aircraft.id)!
          const isFlying = busyAircraftIds.includes(aircraft.id)
          const destroyedModules = state.destroyedModules

          return (
            <li key={aircraft.id} className="card">
              <AircraftPicture isFlying={isFlying} damageLevel={damageLevelOf(aircraft.durability, aircraft.model.durability)} aircraftId={aircraft.id} tailNumber={aircraft.number} />
              <strong>
                {aircraft.model.name} {t('squadron.aircraftNumber', { number: aircraft.number })}
              </strong>
              <span>{t(`squadron.categories.${aircraft.model.category}`)}</span>
              {isFlying && <span className="status">{t('base.mission.inFlight')}</span>}
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
            </li>
          )
        })}
        <UpgradeCard info={upgrade} commandPoints={commandPoints} onBuy={onUpgrade} />
      </ul>
    </Pane>
  )
}

export default HangarPanel
