import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDuration } from './formatDuration'
import type { BusyCrews } from './flights'
import MissionBriefing from './MissionBriefing'
import type { Base, Offer, Squadron } from './useBase'

type Props = {
  weather: Base['headquarters']['weather']
  offers: Offer[]
  squadron: Squadron
  busy: BusyCrews
  onLaunch: (missionId: number, pilotIds: number[], aircraftIds: number[], fuel: number, ammunition: number) => void
}

/** The weather, the missions on the table, and the briefing of the one being prepared. */
function MissionBoard({ weather, offers, squadron, busy, onLaunch }: Props) {
  const { t } = useTranslation()
  const [preparedId, setPreparedId] = useState<number | null>(null)
  const prepared = offers.find((offer) => offer.id === preparedId)

  return (
    <>
      <h4>{t('base.mission.title')}</h4>
      <p className="squadron-hint">{t('base.mission.weather', { windSpeed: weather.windSpeed })}</p>
      <ul className="cards">
        {offers.map((offer) => (
          <li key={offer.id} className="card">
            <strong>{t(`base.mission.types.${offer.type}`)}</strong>
            <span>{t('base.mission.aircraftCount', { count: offer.aircraftCount })}</span>
            <dl>
              <dt>{t('base.mission.duration')}</dt>
              <dd>{formatDuration(offer.durationSeconds)}</dd>
              <dt>{t('base.mission.fuelPerAircraft')}</dt>
              <dd>{offer.fuelPerAircraft}</dd>
              <dt>{t('base.mission.ammunitionPerAircraft')}</dt>
              <dd>{offer.ammunitionPerAircraft}</dd>
              <dt>{t('base.mission.risk')}</dt>
              <dd>{t(`base.mission.riskLevels.${offer.risk}`)}</dd>
              <dt>{t('base.mission.rewardSupplies')}</dt>
              <dd>{offer.rewardSupplies}</dd>
              <dt>{t('base.mission.rewardCommandPoints')}</dt>
              <dd>{offer.rewardCommandPoints}</dd>
            </dl>
            <div className="card-actions">
              <button type="button" aria-pressed={preparedId === offer.id} onClick={() => setPreparedId(preparedId === offer.id ? null : offer.id)}>
                {t('base.mission.prepare')}
              </button>
            </div>
          </li>
        ))}
      </ul>
      {prepared !== undefined && (
        <MissionBriefing
          key={prepared.id}
          offer={prepared}
          squadron={squadron}
          busy={busy}
          onLaunch={(pilotIds, aircraftIds, fuel, ammunition) => onLaunch(prepared.id, pilotIds, aircraftIds, fuel, ammunition)}
        />
      )}
    </>
  )
}

export default MissionBoard
