import { useTranslation } from 'react-i18next'
import { formatDuration } from './formatDuration'
import type { Flight } from './useBase'
import type { Squadron } from './useSquadron'

type Props = {
  flights: Flight[]
  squadron: Squadron
  onReceive: (missionId: number) => void
}

/** The missions under way, each with its crews and the time left; one that is over can be received. */
function FlightList({ flights, squadron, onReceive }: Props) {
  const { t } = useTranslation()

  function crewLabel(crew: Flight['crews'][number]): string {
    const pilot = squadron.pilots.find((candidate) => candidate.id === crew.pilotId)!
    const aircraft = squadron.aircraft.find((candidate) => candidate.id === crew.aircraftId)!
    return `${pilot.name} (${aircraft.model.name})`
  }

  return (
    <>
      <h4>{t('base.mission.flights')}</h4>
      <ul className="jobs">
        {flights.map((flight) => (
          <li key={flight.id}>
            {t(`base.mission.types.${flight.type}`)} — {flight.remainingSeconds === 0 ? t('base.mission.landed') : formatDuration(flight.remainingSeconds)}
            {' : '}
            {flight.crews.map(crewLabel).join(', ')}
            {' — '}
            {t('base.mission.loaded', { fuel: flight.fuelLoaded, ammunition: flight.ammunitionLoaded })}
            {flight.remainingSeconds === 0 && (
              <button type="button" onClick={() => onReceive(flight.id)}>
                {t('base.mission.receive')}
              </button>
            )}
          </li>
        ))}
      </ul>
    </>
  )
}

export default FlightList
