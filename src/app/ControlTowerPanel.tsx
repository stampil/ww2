import { useTranslation } from 'react-i18next'
import EventList from './EventList'
import FlightList from './FlightList'
import { formatDuration } from './formatDuration'
import type { BusyCrews } from './flights'
import Gauge from './Gauge'
import GiveTo from './GiveTo'
import Icon from './Icon'
import MissionBoard from './MissionBoard'
import Pane from './Pane'
import type { AwayAircraft, Base, BaseEvent, Flight, Offer, Recipient, Rest, Squadron } from './useBase'

const GAUGE_MAX = 100

type Props = {
  squadron: Squadron
  weather: Base['headquarters']['weather']
  offers: Offer[]
  flights: Flight[]
  rests: Rest[]
  /** The aircraft of the base stationed at another base, with their pilots. */
  away: AwayAircraft[]
  recruitment: Base['roster']['recruitment']
  events: BaseEvent[]
  busy: BusyCrews
  unavailable: BusyCrews
  onLaunch: (missionId: number, pilotIds: number[], aircraftIds: number[], fuel: number, ammunition: number) => void
  onReceive: (missionId: number) => void
  onRest: (pilotId: number) => void
  onRecruit: () => void
  /** The bases a gift can go to; a pilot goes to the player's own only. */
  recipients: Recipient[]
  onGivePilot: (pilotId: number, recipientBaseId: number) => void
}

/** The flights under way, the latest events, the missions on the table, and the pilots, who can rest and be joined by new ones. */
function ControlTowerPanel({ squadron, weather, offers, flights, rests, away, recruitment, events, busy, unavailable, onLaunch, onReceive, onRest, onRecruit, recipients, onGivePilot }: Props) {
  const { t } = useTranslation()
  const ownRecipients = recipients.filter((recipient) => recipient.kinship === 'own')

  return (
    <>
      {flights.length > 0 && <FlightList flights={flights} squadron={squadron} onReceive={onReceive} />}
      {events.length > 0 && <EventList events={events} />}
      <MissionBoard weather={weather} offers={offers} squadron={squadron} busy={unavailable} onLaunch={onLaunch} />
      <Pane title={t('squadron.pilots')}>
        <ul className="cards">
          {squadron.pilots.map((pilot) => {
            const rest = rests.find((candidate) => candidate.pilotId === pilot.id)
            const isFlying = busy.pilotIds.includes(pilot.id)
            const awayAircraft = away.find((candidate) => candidate.pilotId === pilot.id)

            return (
              <li key={pilot.id} className="card">
                <div className="card-head">
                  <span className="portrait" aria-hidden="true">
                    <Icon name="pilot" />
                  </span>
                  <div>
                    <strong>{pilot.name}</strong>
                    <span>
                      <Icon name="commandPoints" />
                      {t(`squadron.ranks.${pilot.rank}`)}
                    </span>
                  </div>
                </div>
                {isFlying && awayAircraft === undefined && <span className="status">{t('base.mission.inFlight')}</span>}
                {awayAircraft !== undefined && (
                  <span className="status">
                    <Icon name="site" />
                    {t(`stationing.phase.${awayAircraft.phase}`, { site: t(`world.site.${awayAircraft.site}`), time: formatDuration(awayAircraft.remainingSeconds) })}
                  </span>
                )}
                {rest !== undefined && (
                  <span className="status">
                    <Icon name="rest" />
                    {t('base.mission.resting', { time: formatDuration(rest.remainingSeconds) })}
                  </span>
                )}
                <Gauge label={t('squadron.fatigue')} value={pilot.fatigue} max={GAUGE_MAX} higherIsBetter={false} />
                <Gauge label={t('squadron.stress')} value={pilot.stress} max={GAUGE_MAX} higherIsBetter={false} />
                <ul className="stats">
                  <li title={t('squadron.accuracy')}>
                    <Icon name="armament" />
                    {pilot.effectiveAccuracy}
                  </li>
                  <li title={t('squadron.resilience')}>
                    <Icon name="resilience" />
                    {pilot.effectiveResilience}
                  </li>
                </ul>
                <div className="card-actions">
                  <button type="button" disabled={isFlying || rest !== undefined || (pilot.fatigue === 0 && pilot.stress === 0)} onClick={() => onRest(pilot.id)}>
                    <Icon name="rest" />
                    {t('base.mission.rest')}
                  </button>
                  <GiveTo recipients={ownRecipients} isDisabled={isFlying || rest !== undefined} onGive={(recipientBaseId) => onGivePilot(pilot.id, recipientBaseId)} />
                </div>
              </li>
            )
          })}
          <li className="card">
            <div className="card-head">
              <span className="portrait" aria-hidden="true">
                <Icon name="recruit" />
              </span>
              <div>
                <strong>{t('base.mission.recruit')}</strong>
                <span>{t('base.mission.recruitCost', { cost: recruitment.cost })}</span>
              </div>
            </div>
            <div className="card-actions">
              <button type="button" disabled={squadron.pilots.length >= recruitment.maxPilots} onClick={onRecruit}>
                <Icon name="recruit" />
                {t('base.mission.recruitButton')}
              </button>
            </div>
          </li>
        </ul>
      </Pane>
    </>
  )
}

export default ControlTowerPanel
