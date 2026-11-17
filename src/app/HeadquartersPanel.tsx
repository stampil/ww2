import { useTranslation } from 'react-i18next'
import FlightList from './FlightList'
import type { BusyCrews } from './flights'
import MissionBoard from './MissionBoard'
import MissionReports from './MissionReports'
import type { Base, Flight, Offer, Report } from './useBase'
import type { Squadron } from './useSquadron'

const GAUGE_MAX = 100

type Props = {
  squadron: Squadron | null
  weather: Base['headquarters']['weather']
  offers: Offer[]
  flights: Flight[]
  reports: Report[]
  busy: BusyCrews
  onLaunch: (missionId: number, pilotIds: number[], aircraftIds: number[], fuel: number, ammunition: number) => void
  onReceive: (missionId: number) => void
}

/** The flights under way, the latest reports, the missions on the table, and the pilots of the squadron. */
function HeadquartersPanel({ squadron, weather, offers, flights, reports, busy, onLaunch, onReceive }: Props) {
  const { t } = useTranslation()

  if (squadron === null) {
    return null
  }

  return (
    <>
      {flights.length > 0 && <FlightList flights={flights} squadron={squadron} onReceive={onReceive} />}
      {reports.length > 0 && <MissionReports reports={reports} />}
      <MissionBoard weather={weather} offers={offers} squadron={squadron} busy={busy} onLaunch={onLaunch} />
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
