import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDuration } from './formatDuration'
import type { BusyCrews } from './flights'
import Icon from './Icon'
import MissionBriefing from './MissionBriefing'
import MissionPicture from './MissionPicture'
import Pane from './Pane'
import { crewShortage } from './shortages'
import type { Base, Offer, Squadron } from './useBase'

const RISK_LEVELS = [1, 2, 3]

type Props = {
  weather: Base['headquarters']['weather']
  offers: Offer[]
  squadron: Squadron
  /** The stocks that the fuel and the ammunition of a mission are taken from. */
  resources: Base['resources']
  busy: BusyCrews
  onLaunch: (missionId: number, pilotIds: number[], aircraftIds: number[], fuel: number, ammunition: number) => Promise<string | null>
}

/** The weather, the missions on the table as orders with their figures, and the briefing of the one being prepared. */
function MissionBoard({ weather, offers, squadron, resources, busy, onLaunch }: Props) {
  const { t } = useTranslation()
  const [preparedId, setPreparedId] = useState<number | null>(null)
  const prepared = offers.find((offer) => offer.id === preparedId)

  return (
    <>
      <Pane title={t('base.mission.title')}>
        <p className="note">
          <Icon name="wind" />
          {t('base.mission.weather', { windSpeed: weather.windSpeed })}
        </p>
        <ul className="cards">
          {offers.map((offer) => {
            const crewReason = crewShortage(offer, squadron, busy)

            return (
              <li key={offer.id} className="card">
                <div className="card-head">
                  <MissionPicture type={offer.type} />
                  <div>
                    <strong>{t(`base.mission.types.${offer.type}`)}</strong>
                    <span>{t('base.mission.aircraftCount', { count: offer.aircraftCount })}</span>
                  </div>
                </div>
                <ul className="stats">
                  <li title={t('base.mission.duration')}>
                    <Icon name="clock" />
                    {formatDuration(offer.durationSeconds)}
                  </li>
                  <li title={t('base.mission.fuelPerAircraft')}>
                    <Icon name="fuel" />
                    {offer.fuelPerAircraft}
                  </li>
                  <li title={t('base.mission.ammunitionPerAircraft')}>
                    <Icon name="ammunition" />
                    {offer.ammunitionPerAircraft}
                  </li>
                  <li title={`${t('base.mission.risk')} : ${t(`base.mission.riskLevels.${offer.risk}`)}`}>
                    <Icon name="warning" />
                    <span className="risk" role="img" aria-label={t(`base.mission.riskLevels.${offer.risk}`)}>
                      {RISK_LEVELS.map((level) => (
                        <i key={level} data-on={level <= offer.risk} />
                      ))}
                    </span>
                  </li>
                  <li title={t('base.mission.rewardSupplies')}>
                    <Icon name="supplies" />
                    {offer.rewardSupplies}
                  </li>
                  <li title={t('base.mission.rewardCommandPoints')}>
                    <Icon name="commandPoints" />
                    {offer.rewardCommandPoints}
                  </li>
                </ul>
                <div className="card-actions">
                  <button type="button" aria-pressed={preparedId === offer.id} disabled={crewReason !== null && preparedId !== offer.id} onClick={() => setPreparedId(preparedId === offer.id ? null : offer.id)}>
                    {t('base.mission.prepare')}
                  </button>
                  {crewReason !== null && <span className="order-reason">{t(crewReason)}</span>}
                </div>
              </li>
            )
          })}
        </ul>
      </Pane>
      {prepared !== undefined && (
        <MissionBriefing
          key={prepared.id}
          offer={prepared}
          squadron={squadron}
          resources={resources}
          busy={busy}
          onLaunch={(pilotIds, aircraftIds, fuel, ammunition) => onLaunch(prepared.id, pilotIds, aircraftIds, fuel, ammunition)}
        />
      )}
    </>
  )
}

export default MissionBoard
