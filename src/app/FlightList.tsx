import { useTranslation } from 'react-i18next'
import { formatDuration } from './formatDuration'
import Icon from './Icon'
import OrderButton from './OrderButton'
import Pane from './Pane'
import { squadronAircraft } from './useBase'
import type { Flight, Squadron } from './useBase'

type Props = {
  flights: Flight[]
  squadron: Squadron
  onReceive: (missionId: number) => Promise<string | null>
}

/** The missions under way, each with its crews and the time left; one that is over can be received. */
function FlightList({ flights, squadron, onReceive }: Props) {
  const { t } = useTranslation()

  function crewLabel(crew: Flight['crews'][number]): string {
    const pilot = squadron.pilots.find((candidate) => candidate.id === crew.pilotId)!
    const aircraft = squadronAircraft(squadron).find((candidate) => candidate.id === crew.aircraftId)!
    return `${pilot.name} (${aircraft.model.name} ${t('squadron.aircraftNumber', { number: aircraft.number })})`
  }

  return (
    <Pane title={t('base.mission.flights')}>
      <ul className="jobs">
        {flights.map((flight) => (
          <li key={flight.id}>
            <Icon name={flight.type} />
            <span>{flight.targetSite === null ? t(`base.mission.types.${flight.type}`) : t('base.mission.against', { type: t(`base.mission.types.${flight.type}`), site: t(`world.site.${flight.targetSite}`) })}</span>
            <strong>{flight.remainingSeconds === 0 ? t('base.mission.landed') : formatDuration(flight.remainingSeconds)}</strong>
            <span className="muted">{flight.crews.map(crewLabel).join(', ')}</span>
            <span className="muted">{t('base.mission.loaded', { fuel: flight.fuelLoaded, ammunition: flight.ammunitionLoaded })}</span>
            {flight.remainingSeconds === 0 && (
              <OrderButton onOrder={() => onReceive(flight.id)}>{t('base.mission.receive')}</OrderButton>
            )}
          </li>
        ))}
      </ul>
    </Pane>
  )
}

export default FlightList
