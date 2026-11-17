import { useTranslation } from 'react-i18next'
import type { Squadron } from './useSquadron'

const GAUGE_MAX = 100

/** The pilots of the squadron, waiting for the missions and the recruitment to come. */
function HeadquartersPanel({ squadron }: { squadron: Squadron | null }) {
  const { t } = useTranslation()

  if (squadron === null) {
    return null
  }

  return (
    <>
      <h4>{t('squadron.pilots')}</h4>
      <ul className="cards">
        {squadron.pilots.map((pilot) => (
          <li key={pilot.id} className="card">
            <strong>{pilot.name}</strong>
            <span>{t(`squadron.ranks.${pilot.rank}`)}</span>
            <dl>
              <dt>{t('squadron.fatigue')}</dt>
              <dd>
                <meter min={0} max={GAUGE_MAX} value={pilot.fatigue} />
              </dd>
              <dt>{t('squadron.stress')}</dt>
              <dd>
                <meter min={0} max={GAUGE_MAX} value={pilot.stress} />
              </dd>
              <dt>{t('squadron.accuracy')}</dt>
              <dd>{pilot.effectiveAccuracy}</dd>
              <dt>{t('squadron.resilience')}</dt>
              <dd>{pilot.effectiveResilience}</dd>
            </dl>
          </li>
        ))}
      </ul>
    </>
  )
}

export default HeadquartersPanel
