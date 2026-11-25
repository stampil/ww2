import { useTranslation } from 'react-i18next'
import { useRankName } from './ClanContext'
import FlightList from './FlightList'
import { formatDuration } from './formatDuration'
import type { BusyCrews } from './flights'
import Gauge from './Gauge'
import { GAUGE_MAX } from './gaugeMax'
import GiveTo from './GiveTo'
import Icon from './Icon'
import MissionBoard from './MissionBoard'
import OrderButton from './OrderButton'
import Pane from './Pane'
import PilotPortrait from './PilotPortrait'
import { recruitShortage } from './shortages'
import type { AwayAircraft, Base, Flight, Offer, Recipient, Rest, Squadron } from './useBase'


type Props = {
  squadron: Squadron
  /** The stocks and the supplies of the camp, which the missions and the recruits are paid from. */
  resources: Base['resources']
  weather: Base['headquarters']['weather']
  offers: Offer[]
  flights: Flight[]
  rests: Rest[]
  /** The aircraft of the base stationed at another base, with their pilots. */
  away: AwayAircraft[]
  recruitment: Base['roster']['recruitment']
  busy: BusyCrews
  unavailable: BusyCrews
  /** The minutes the supplies the front sends take to pay for the cheapest step toward a flight while the camp is stuck, null while it is not. */
  blockedMinutes: number | null
  /** Asks to open the journal of the base. */
  onOpenJournal: () => void
  /** Asks to open the roster of the squadron. */
  onOpenRoster: () => void
  onLaunch: (missionId: number, pilotIds: number[], aircraftIds: number[], fuel: number, ammunition: number) => Promise<string | null>
  onReceive: (missionId: number) => Promise<string | null>
  onRest: (pilotId: number) => Promise<string | null>
  onRecruit: () => Promise<string | null>
  /** Asks to start the game over from nothing. */
  onStartOver: () => void
  /** The bases a gift can go to; a pilot goes to the player's own only. */
  recipients: Recipient[]
  onGivePilot: (pilotId: number, recipientBaseId: number) => Promise<string | null>
}

/** The flights under way, the journal, the missions on the table, and the pilots, who can rest and be joined by new ones. */
function ControlTowerPanel({ squadron, resources, weather, offers, flights, rests, away, recruitment, busy, unavailable, blockedMinutes, onOpenJournal, onOpenRoster, onLaunch, onReceive, onRest, onRecruit, onStartOver, recipients, onGivePilot }: Props) {
  const { t } = useTranslation()
  const rankName = useRankName()
  const ownRecipients = recipients.filter((recipient) => recipient.kinship === 'own')

  return (
    <>
      {flights.length > 0 && <FlightList flights={flights} squadron={squadron} onReceive={onReceive} />}
      <Pane title={t('base.mission.reports')}>
        <div className="card-actions">
          <button type="button" onClick={onOpenJournal}>
            {t('journal.open')}
          </button>
          <button type="button" onClick={onOpenRoster}>
            {t('squadron.roster.open')}
          </button>
        </div>
      </Pane>
      <MissionBoard weather={weather} offers={offers} squadron={squadron} resources={resources} busy={unavailable} onLaunch={onLaunch} />
      <Pane title={t('squadron.pilots')}>
        <ul className="cards">
          {squadron.pilots.map((pilot) => {
            const rest = rests.find((candidate) => candidate.pilotId === pilot.id)
            const isFlying = busy.pilotIds.includes(pilot.id)
            const awayAircraft = away.find((candidate) => candidate.pilotId === pilot.id)

            return (
              <li key={pilot.id} className="card">
                <div className="card-head">
                  <PilotPortrait pilotId={pilot.id} />
                  <div>
                    <strong>{pilot.name}</strong>
                    <span>
                      <Icon name="commandPoints" />
                      {rankName(pilot.rank)}
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
                  <li title={t('squadron.roster.victories')}>
                    <Icon name="airCombat" />
                    {pilot.record.victories}
                  </li>
                </ul>
                <div className="card-actions">
                  <OrderButton disabled={isFlying || rest !== undefined || (pilot.fatigue === 0 && pilot.stress === 0)} onOrder={() => onRest(pilot.id)}>
                    <Icon name="rest" />
                    {t('base.mission.rest')}
                  </OrderButton>
                  <GiveTo recipients={ownRecipients} isDisabled={isFlying || rest !== undefined} onGive={(recipientBaseId) => onGivePilot(pilot.id, recipientBaseId)} />
                </div>
              </li>
            )
          })}
          {squadron.pilots.length < recruitment.maxPilots && (
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
                <OrderButton onOrder={onRecruit} reasonKey={recruitShortage(recruitment, resources.supplies)}>
                  <Icon name="recruit" />
                  {t('base.mission.recruitButton')}
                </OrderButton>
              </div>
            </li>
          )}
        </ul>
      </Pane>
      {blockedMinutes !== null && (
        <div className="game-tools">
          <p>{t('reset.blocked', { minutes: blockedMinutes })}</p>
          <button type="button" onClick={onStartOver}>
            {t('reset.button')}
          </button>
        </div>
      )}
    </>
  )
}

export default ControlTowerPanel
