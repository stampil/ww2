import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Player } from './useAccount'

const SQUADRON_URL = '/api/squadron'
const GAUGE_MAX = 100

type Pilot = {
  id: number
  name: string
  rank: number
  fatigue: number
  stress: number
  effectiveAccuracy: number
  effectiveResilience: number
}
type Aircraft = {
  id: number
  durability: number
  model: { name: string; category: string; durability: number; maneuverability: number; fuelCapacity: number; ammunitionCapacity: number }
}
type Squadron = { pilots: Pilot[]; aircraft: Aircraft[] }

/** The pilots and the aircraft of the player who is signed in, or an invitation to sign in. */
function SquadronPanel({ player }: { player: Player | null }) {
  const { t } = useTranslation()
  const [squadron, setSquadron] = useState<Squadron | null>(null)

  useEffect(() => {
    if (player === null) {
      setSquadron(null)
      return
    }
    void fetch(SQUADRON_URL)
      .then((response) => response.json() as Promise<Squadron>)
      .then(setSquadron)
  }, [player])

  if (player === null) {
    return <p className="squadron-hint">{t('squadron.signInHint')}</p>
  }

  return (
    <section className="squadron" aria-label={t('squadron.title', { nickname: player.nickname })}>
      <h2>{t('squadron.title', { nickname: player.nickname })}</h2>
      {squadron !== null && (
        <>
          <h3>{t('squadron.pilots')}</h3>
          <ul className="squadron-cards">
            {squadron.pilots.map((pilot) => (
              <li key={pilot.id} className="squadron-card">
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
          <h3>{t('squadron.aircraft')}</h3>
          <ul className="squadron-cards">
            {squadron.aircraft.map((aircraft) => (
              <li key={aircraft.id} className="squadron-card">
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
      )}
    </section>
  )
}

export default SquadronPanel
