import { useTranslation } from 'react-i18next'
import FlightList from './FlightList'
import type { BusyCrews } from './flights'
import MissionBoard from './MissionBoard'
import type { Flight, Offer } from './useBase'
import type { Squadron } from './useSquadron'

const GAUGE_MAX = 100

type Props = {
  squadron: Squadron | null
  offers: Offer[]
  flights: Flight[]
  busy: BusyCrews
  onLaunch: (missionId: number, pilotIds: number[], aircraftIds: number[], fuel: number, ammunition: number) => void
  onReceive: (missionId: number) => void
}

/** The flights under way, the missions on the table, and the pilots of the squadron. */
function HeadquartersPanel({ squadron, offers, flights, busy, onLaunch, onReceive }: Props) {
  const { t } = useTranslation()

  if (squadron === null) {
    return null
  }

  return (
    <>
      {flights.length > 0 && <FlightList flights={flights} squadron={squadron} onReceive={onReceive} />}
      <MissionBoard offers={offers} squadron={squadron} busy={busy} onLaunch={onLaunch} />
      <h4>{t('squadron.pilots')}</h4>
      <ul className="cards">
        {squadron.pilots.map((pilot) => (
          <li key={pilot.id} className="card">
            <strong>{pilot.name}</strong>
            <span>{t(`squadron.ranks.${pilot.rank}`)}</span>
            {busy.pilotIds.includes(pilot.id) && <span>{t('base.mission.inFlight')}</span>}
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
