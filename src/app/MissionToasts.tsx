import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { dueAlerts, isAlertStarted } from './flights'
import Icon from './Icon'
import { TARGET_NATIONALITIES } from './targetNationality'
import type { Clan, Flight, FlightAlert, MissionType, Squadron } from './useBase'

// The missions whose mini-game is a strafing run over enemy vehicles.
const STRAFING_TYPES: MissionType[] = ['groundAttack', 'raid']
// How long a call waits for the player before it goes away and its mini-game is lost, and how often the bar is redrawn.
const TOAST_SECONDS = 30
const TICK_MILLISECONDS = 250
const MILLISECONDS_PER_SECOND = 1000

type Props = {
  clan: Clan
  flights: Flight[]
  squadron: Squadron
  /** Opens the mini-game of an alert. */
  onOpen: (alertId: number) => void
  /** True while the control tower is open, where the flights under way are: the player is busy with them. */
  isTowerOpen: boolean
}

/** The texts of the toast and of the window of a mini-game: the grid duel, the strafing run of a ground attack, the photos of a reconnaissance, the flak to dodge on the way to an enemy camp, or the dogfight from the cockpit. */
function namespaceOf(alert: FlightAlert, flight: Flight): 'duel' | 'strafe' | 'photo' | 'combat' | 'flak' {
  if (alert.kind === 'dogfight') {
    return 'duel'
  }
  if (alert.kind === 'flak') {
    return 'flak'
  }
  if (STRAFING_TYPES.includes(flight.type)) {
    return 'strafe'
  }
  return flight.type === 'reconnaissance' ? 'photo' : 'combat'
}

/**
 * The calls of the flights in the air, as toasts over the game: one for each mini-game that waits for the player, which a click opens.
 * A call that has not been taken goes away after thirty seconds, its bar running down, and its mini-game is lost: the flight is received as if it had not been played.
 * Taking another call, or opening the control tower, stops the countdown of the other calls: they stay until they are taken.
 */
function MissionToasts({ clan, flights, squadron, onOpen, isTowerOpen }: Props) {
  const { t } = useTranslation()
  const due = dueAlerts(flights)
  const dueKey = due.map(({ alert }) => alert.id).join(',')
  const [stoppedIds, setStoppedIds] = useState<number[]>([])
  const [deadlines, setDeadlines] = useState<Record<number, number>>({})
  const [now, setNow] = useState(() => Date.now())
  const nationality = t(`strafe.nationalities.${TARGET_NATIONALITIES[clan]}`)

  // A call gets its deadline the first time it is seen, from how long ago it showed; the later readings of the server do not move it.
  useEffect(() => {
    const moment = Date.now()
    setNow(moment)
    setDeadlines((current) => {
      const next = { ...current }
      for (const { alert } of dueAlerts(flights)) {
        next[alert.id] ??= moment + (TOAST_SECONDS - alert.lateSeconds) * MILLISECONDS_PER_SECOND
      }
      return next
    })
  }, [flights])

  useEffect(() => {
    if (dueKey === '') {
      return
    }
    const timer = window.setInterval(() => setNow(Date.now()), TICK_MILLISECONDS)

    return () => window.clearInterval(timer)
  }, [dueKey])

  const remainingSeconds = (alert: FlightAlert) => ((deadlines[alert.id] ?? now + (TOAST_SECONDS - alert.lateSeconds) * MILLISECONDS_PER_SECOND) - now) / MILLISECONDS_PER_SECOND
  const shown = due.filter(({ alert }) => isAlertStarted(alert) || stoppedIds.includes(alert.id) || remainingSeconds(alert) > 0)
  const shownKey = shown.map(({ alert }) => alert.id).join(',')

  // The calls on the screen when the tower opens stop counting down; one that had already gone away does not come back.
  useEffect(() => {
    if (isTowerOpen && shownKey !== '') {
      setStoppedIds((current) => [...new Set([...current, ...shownKey.split(',').map(Number)])])
    }
  }, [isTowerOpen, shownKey])

  function take(alertId: number): void {
    setStoppedIds((current) => [...new Set([...current, ...shown.map(({ alert }) => alert.id).filter((id) => id !== alertId)])])
    onOpen(alertId)
  }

  if (shown.length === 0) {
    return null
  }

  return (
    <div className="mission-toasts" role="status">
      {shown.map(({ alert, flight }) => {
        const crew = flight.crews.find((candidate) => candidate.aircraftId === alert.aircraftId)!
        const pilot = squadron.pilots.find((candidate) => candidate.id === crew.pilotId)!
        const isStarted = isAlertStarted(alert)
        const isCountingDown = !isStarted && !stoppedIds.includes(alert.id)
        const namespace = namespaceOf(alert, flight)
        return (
          <button key={alert.id} type="button" className="mission-toast" onClick={() => take(alert.id)}>
            <Icon name="warning" />
            <span>{t(isStarted ? `${namespace}.toastResume` : `${namespace}.toast`, { pilot: pilot.name, nationality })}</span>
            <strong>{t(isStarted ? 'duel.resume' : `${namespace}.take`)}</strong>
            {isCountingDown && <span className="mission-toast-bar" aria-hidden="true" style={{ transform: `scaleX(${Math.max(0, remainingSeconds(alert) / TOAST_SECONDS)})` }} />}
          </button>
        )
      })}
    </div>
  )
}

export default MissionToasts
