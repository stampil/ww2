import { useTranslation } from 'react-i18next'
import { dueAlerts, isAlertStarted } from './flights'
import Icon from './Icon'
import type { Flight, Squadron } from './useBase'

type Props = {
  flights: Flight[]
  squadron: Squadron
  /** Opens the mini-game of an alert. */
  onOpen: (alertId: number) => void
}

/** The calls of the flights in the air, as toasts over the game: one for each mini-game that waits for the player, which a click opens. */
function MissionToasts({ flights, squadron, onOpen }: Props) {
  const { t } = useTranslation()
  const due = dueAlerts(flights)

  if (due.length === 0) {
    return null
  }

  return (
    <div className="mission-toasts" role="status">
      {due.map(({ alert, flight }) => {
        const crew = flight.crews.find((candidate) => candidate.aircraftId === alert.aircraftId)!
        const pilot = squadron.pilots.find((candidate) => candidate.id === crew.pilotId)!
        const isStarted = isAlertStarted(alert)
        const namespace = alert.kind === 'cockpit' ? 'combat' : 'duel'
        return (
          <button key={alert.id} type="button" className="mission-toast" onClick={() => onOpen(alert.id)}>
            <Icon name="warning" />
            <span>{t(isStarted ? `${namespace}.toastResume` : `${namespace}.toast`, { pilot: pilot.name })}</span>
            <strong>{t(isStarted ? 'duel.resume' : `${namespace}.take`)}</strong>
          </button>
        )
      })}
    </div>
  )
}

export default MissionToasts
