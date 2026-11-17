import { useTranslation } from 'react-i18next'
import { formatDuration } from './formatDuration'
import type { HangarAircraft, Part, Squadron } from './useBase'

const PARTS: Part[] = ['engine', 'wings', 'fuselage', 'armament']

type Props = {
  squadron: Squadron
  hangarAircraft: HangarAircraft[]
  busyAircraftIds: number[]
  onRepair: (aircraftId: number) => void
}

/** The aircraft of the squadron with their modules; one that is damaged can be repaired, if a mechanic and the spare parts are there. */
function HangarPanel({ squadron, hangarAircraft, busyAircraftIds, onRepair }: Props) {
  const { t } = useTranslation()

  return (
    <>
      <h4>{t('squadron.aircraft')}</h4>
      <ul className="cards">
        {squadron.aircraft.map((aircraft) => {
          const state = hangarAircraft.find((candidate) => candidate.aircraftId === aircraft.id)!
          const isFlying = busyAircraftIds.includes(aircraft.id)

          return (
            <li key={aircraft.id} className="card">
              <strong>{aircraft.model.name}</strong>
              <span>{t(`squadron.categories.${aircraft.model.category}`)}</span>
              {isFlying && <span>{t('base.mission.inFlight')}</span>}
              {state.repairSeconds !== null && <span>{t('base.hangar.repairing', { time: formatDuration(state.repairSeconds) })}</span>}
              {state.fireSeconds !== null && <span className="on-fire">{t('base.hangar.onFire', { time: formatDuration(state.fireSeconds) })}</span>}
              <dl>
                <dt>{t('squadron.durability')}</dt>
                <dd>
                  <meter min={0} max={aircraft.model.durability} value={aircraft.durability} />
                </dd>
                <dt>{t('squadron.maneuverability')}</dt>
                <dd>{aircraft.model.maneuverability}</dd>
                <dt>{t('squadron.fuel')}</dt>
                <dd>{aircraft.model.fuelCapacity}</dd>
                <dt>{t('squadron.ammunition')}</dt>
                <dd>{aircraft.model.ammunitionCapacity}</dd>
              </dl>
              <ul className="modules" aria-label={t('base.hangar.modules')}>
                {PARTS.map((part) => {
                  const isDestroyed = state.destroyedModules.includes(part)
                  return (
                    <li key={part} data-destroyed={isDestroyed}>
                      {t(isDestroyed ? 'base.hangar.moduleDestroyed' : 'base.hangar.moduleIntact', { part: t(`base.parts.${part}`) })}
                    </li>
                  )
                })}
              </ul>
              {state.repairDurationSeconds > 0 && state.repairSeconds === null && (
                <div className="card-actions">
                  <button type="button" disabled={isFlying} onClick={() => onRepair(aircraft.id)}>
                    {t('base.hangar.repair', { time: formatDuration(state.repairDurationSeconds) })}
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}

export default HangarPanel
