import { useTranslation } from 'react-i18next'
import EventList from './EventList'
import FlightList from './FlightList'
import { formatDuration } from './formatDuration'
import type { BusyCrews } from './flights'
import MissionBoard from './MissionBoard'
import type { Base, BaseEvent, Flight, Offer, Rest, Squadron } from './useBase'

const GAUGE_MAX = 100

type Props = {
  squadron: Squadron
  weather: Base['headquarters']['weather']
  offers: Offer[]
  flights: Flight[]
  rests: Rest[]
  recruitment: Base['roster']['recruitment']
  events: BaseEvent[]
  busy: BusyCrews
  unavailable: BusyCrews
  onLaunch: (missionId: number, pilotIds: number[], aircraftIds: number[], fuel: number, ammunition: number) => void
  onReceive: (missionId: number) => void
  onRest: (pilotId: number) => void
  onRecruit: () => void
}

/** The flights under way, the latest events, the missions on the table, and the pilots, who can rest and be joined by new ones. */
function HeadquartersPanel({ squadron, weather, offers, flights, rests, recruitment, events, busy, unavailable, onLaunch, onReceive, onRest, onRecruit }: Props) {
  const { t } = useTranslation()

  return (
    <>
      {flights.length > 0 && <FlightList flights={flights} squadron={squadron} onReceive={onReceive} />}
      {events.length > 0 && <EventList events={events} />}
      <MissionBoard weather={weather} offers={offers} squadron={squadron} busy={unavailable} onLaunch={onLaunch} />
      <h4>{t('squadron.pilots')}</h4>
      <ul className="cards">
        {squadron.pilots.map((pilot) => {
          const rest = rests.find((candidate) => candidate.pilotId === pilot.id)
          const isFlying = busy.pilotIds.includes(pilot.id)

          return (
            <li key={pilot.id} className="card">
              <strong>{pilot.name}</strong>
              <span>{t(`squadron.ranks.${pilot.rank}`)}</span>
              {isFlying && <span>{t('base.mission.inFlight')}</span>}
              {rest !== undefined && <span>{t('base.mission.resting', { time: formatDuration(rest.remainingSeconds) })}</span>}
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
              <div className="card-actions">
                <button type="button" disabled={isFlying || rest !== undefined || (pilot.fatigue === 0 && pilot.stress === 0)} onClick={() => onRest(pilot.id)}>
                  {t('base.mission.rest')}
                </button>
              </div>
            </li>
          )
        })}
        <li className="card">
          <strong>{t('base.mission.recruit')}</strong>
          <span>{t('base.mission.recruitCost', { cost: recruitment.cost })}</span>
          <div className="card-actions">
            <button type="button" disabled={squadron.pilots.length >= recruitment.maxPilots} onClick={onRecruit}>
              {t('base.mission.recruitButton')}
            </button>
          </div>
        </li>
      </ul>
    </>
  )
}

export default HeadquartersPanel
