import { useEffect, useRef, useState } from 'react'
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
  /** True while the window of a mini-game is open: the player is on a mission. */
  isPlaying: boolean
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
 * The calls of the flights in the air, as toasts over the game: one for each mini-game that waits for the player, which a click opens, and lost after thirty seconds, its bar running down.
 * The bars stand still while the player is in a mini-game, those of the calls that come meanwhile too, and go on where they stopped; opening the control tower stops those on the screen for good.
 */
function MissionToasts({ clan, flights, squadron, onOpen, isTowerOpen, isPlaying }: Props) {
  const { t } = useTranslation()
  const due = dueAlerts(flights)
  const dueKey = due.map(({ alert }) => alert.id).join(',')
  const [stoppedIds, setStoppedIds] = useState<number[]>([])
  const [remainingMilliseconds, setRemainingMilliseconds] = useState<Record<number, number>>({})
  const nationality = t(`strafe.nationalities.${TARGET_NATIONALITIES[clan]}`)
  // What the countdown reads between two renders: whether the player is in a mini-game, and which calls are counting down.
  const isPlayingRef = useRef(isPlaying)
  const countingIdsRef = useRef<number[]>([])
  isPlayingRef.current = isPlaying
  countingIdsRef.current = due.filter(({ alert }) => !isAlertStarted(alert) && !stoppedIds.includes(alert.id)).map(({ alert }) => alert.id)

  // A call gets its time the first time it is seen, from how long ago it showed; the later readings of the server do not move it.
  useEffect(() => {
    setRemainingMilliseconds((current) => {
      const next = { ...current }
      for (const { alert } of dueAlerts(flights)) {
        next[alert.id] ??= (TOAST_SECONDS - alert.lateSeconds) * MILLISECONDS_PER_SECOND
      }
      return next
    })
  }, [flights])

  // The time of a call runs down by what has gone by between two ticks, except while the player is in a mini-game.
  useEffect(() => {
    if (dueKey === '') {
      return
    }
    let lastTickMilliseconds = Date.now()
    const timer = window.setInterval(() => {
      const moment = Date.now()
      const elapsedMilliseconds = moment - lastTickMilliseconds
      lastTickMilliseconds = moment
      if (isPlayingRef.current) {
        return
      }
      setRemainingMilliseconds((current) => {
        const next = { ...current }
        for (const alertId of countingIdsRef.current) {
          next[alertId] = Math.max(0, current[alertId] - elapsedMilliseconds)
        }
        return next
      })
    }, TICK_MILLISECONDS)

    return () => window.clearInterval(timer)
  }, [dueKey])

  const remainingSeconds = (alert: FlightAlert) => (remainingMilliseconds[alert.id] ?? (TOAST_SECONDS - alert.lateSeconds) * MILLISECONDS_PER_SECOND) / MILLISECONDS_PER_SECOND
  const shown = due.filter(({ alert }) => isAlertStarted(alert) || stoppedIds.includes(alert.id) || remainingSeconds(alert) > 0)
  const shownKey = shown.map(({ alert }) => alert.id).join(',')

  // The calls on the screen when the tower opens stop counting down; one that had already gone away does not come back.
  useEffect(() => {
    if (isTowerOpen && shownKey !== '') {
      setStoppedIds((current) => [...new Set([...current, ...shownKey.split(',').map(Number)])])
    }
  }, [isTowerOpen, shownKey])

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
          <button key={alert.id} type="button" className="mission-toast" onClick={() => onOpen(alert.id)}>
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
