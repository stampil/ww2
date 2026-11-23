import { useTranslation } from 'react-i18next'
import { dueAlerts, isAlertStarted } from './flights'
import Icon from './Icon'
import { TARGET_NATIONALITIES } from './targetNationality'
import type { Clan, Flight, FlightAlert, Squadron } from './useBase'

type Props = {
  clan: Clan
  flights: Flight[]
  squadron: Squadron
  /** Opens the mini-game of an alert. */
  onOpen: (alertId: number) => void
}

/** The texts of the toast and of the window of a mini-game: the grid duel, the strafing run of a ground attack, the photos of a reconnaissance, or the dogfight from the cockpit. */
function namespaceOf(alert: FlightAlert, flight: Flight): 'duel' | 'strafe' | 'photo' | 'combat' {
  if (alert.kind === 'dogfight') {
    return 'duel'
  }
  if (flight.type === 'groundAttack') {
    return 'strafe'
  }
  return flight.type === 'reconnaissance' ? 'photo' : 'combat'
}

/** The calls of the flights in the air, as toasts over the game: one for each mini-game that waits for the player, which a click opens. */
function MissionToasts({ clan, flights, squadron, onOpen }: Props) {
  const { t } = useTranslation()
  const due = dueAlerts(flights)
  const nationality = t(`strafe.nationalities.${TARGET_NATIONALITIES[clan]}`)

  if (due.length === 0) {
    return null
  }

  return (
    <div className="mission-toasts" role="status">
      {due.map(({ alert, flight }) => {
        const crew = flight.crews.find((candidate) => candidate.aircraftId === alert.aircraftId)!
        const pilot = squadron.pilots.find((candidate) => candidate.id === crew.pilotId)!
        const isStarted = isAlertStarted(alert)
        const namespace = namespaceOf(alert, flight)
        return (
          <button key={alert.id} type="button" className="mission-toast" onClick={() => onOpen(alert.id)}>
            <Icon name="warning" />
            <span>{t(isStarted ? `${namespace}.toastResume` : `${namespace}.toast`, { pilot: pilot.name, nationality })}</span>
            <strong>{t(isStarted ? 'duel.resume' : `${namespace}.take`)}</strong>
          </button>
        )
      })}
    </div>
  )
}

export default MissionToasts
