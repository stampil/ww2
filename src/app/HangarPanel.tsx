import { useTranslation } from 'react-i18next'
import type { Squadron } from './useSquadron'

/** The aircraft of the squadron, waiting for the repairs to come. */
function HangarPanel({ squadron }: { squadron: Squadron | null }) {
  const { t } = useTranslation()

  if (squadron === null) {
    return null
  }

  return (
    <>
      <h4>{t('squadron.aircraft')}</h4>
      <ul className="cards">
        {squadron.aircraft.map((aircraft) => (
          <li key={aircraft.id} className="card">
            <strong>{aircraft.model.name}</strong>
            <span>{t(`squadron.categories.${aircraft.model.category}`)}</span>
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
          </li>
        ))}
      </ul>
    </>
  )
}

export default HangarPanel
