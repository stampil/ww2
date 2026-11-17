import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { CockpitCombatScene } from '../three/CockpitCombatScene'
import type { CockpitEnemy, CockpitOutcome, CockpitStatus } from '../three/CockpitCombatScene'
import GameWindow from './GameWindow'
import PilotHead from './PilotHead'
import type { FlightAlert } from './useBase'

const ENEMIES: CockpitEnemy[] = ['bf109', 'vichyD520']
const ROUNDS_PER_AMMUNITION = 5
const PERCENT_TO_SHARE = 0.01
const SECONDS_PER_MINUTE = 60
const STEERING_KEYS: Record<string, { x: number; y: number }> = {
  ArrowLeft: { x: -1, y: 0 },
  KeyA: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  KeyD: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: 1 },
  KeyW: { x: 0, y: 1 },
  ArrowDown: { x: 0, y: -1 },
  KeyS: { x: 0, y: -1 },
}
const FIRING_KEYS = ['Space', 'Enter']

type Props = {
  alert: FlightAlert
  /** What the flight carries, the maneuverability of the aircraft and the accuracy of the pilot: they set the rounds, the turns and the aim. */
  ammunitionLoaded: number
  maneuverability: number
  accuracy: number
  onStart: (alertId: number) => Promise<void>
  onFinish: (alertId: number, outcome: CockpitOutcome) => Promise<void>
  onClose: () => void
}

/**
 * A dogfight flown in real time from the cockpit, as in Wings: the player steers with the arrow keys or a finger, fires with the space bar or the button,
 * and the head of the pilot shows which way to turn. The browser plays it and tells the server how it ended.
 */
function CockpitCombatWindow({ alert, ammunitionLoaded, maneuverability, accuracy, onStart, onFinish, onClose }: Props) {
  const { t } = useTranslation()
  const viewRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<CockpitCombatScene | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [status, setStatus] = useState<CockpitStatus | null>(null)
  const [outcome, setOutcome] = useState<CockpitOutcome | null>(null)
  const enemy = ENEMIES[alert.id % ENEMIES.length]

  useEffect(() => {
    let isCurrent = true
    void onStart(alert.id).then(() => {
      if (isCurrent) {
        setIsReady(true)
      }
    })
    return () => {
      isCurrent = false
    }
    // The combat is started once, when its window opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alert.id])

  useEffect(() => {
    if (!isReady) {
      return
    }
    const scene = new CockpitCombatScene(
      viewRef.current!,
      { enemy, ammunition: ammunitionLoaded * ROUNDS_PER_AMMUNITION, agility: maneuverability * PERCENT_TO_SHARE, accuracy: accuracy * PERCENT_TO_SHARE },
      setStatus,
      (result) => {
        setOutcome(result)
        void onFinish(alert.id, result)
      },
    )
    sceneRef.current = scene
    const pressed = new Set<string>()
    const steer = (): void => {
      let x = 0
      let y = 0
      pressed.forEach((code) => {
        x += STEERING_KEYS[code]?.x ?? 0
        y += STEERING_KEYS[code]?.y ?? 0
      })
      scene.setControls(x, y)
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (STEERING_KEYS[event.code] !== undefined || FIRING_KEYS.includes(event.code)) {
        event.preventDefault()
        pressed.add(event.code)
        scene.setFiring(FIRING_KEYS.some((code) => pressed.has(code)))
        steer()
      }
    }
    const onKeyUp = (event: KeyboardEvent): void => {
      pressed.delete(event.code)
      scene.setFiring(FIRING_KEYS.some((code) => pressed.has(code)))
      steer()
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      scene.dispose()
      sceneRef.current = null
    }
    // The scene is made once, when the combat is started.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady])

  /** A finger or the mouse held on the view steers toward where it is: the further from the middle, the harder the turn. */
  function steerToward(event: ReactPointerEvent<HTMLDivElement>): void {
    const box = event.currentTarget.getBoundingClientRect()
    sceneRef.current?.setControls(((event.clientX - box.left) / box.width - 0.5) * 2, -((event.clientY - box.top) / box.height - 0.5) * 2)
  }

  const secondsLeft = Math.ceil(status?.secondsLeft ?? 0)
  const clock = `${Math.floor(secondsLeft / SECONDS_PER_MINUTE)}:${String(secondsLeft % SECONDS_PER_MINUTE).padStart(2, '0')}`

  return (
    <GameWindow title={t('combat.title')} hint={t('combat.hint', { enemy: t(`combat.enemies.${enemy}`) })} onDismiss={onClose}>
      <div
        className="cockpit-view"
        ref={viewRef}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId)
          steerToward(event)
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            steerToward(event)
          }
        }}
        onPointerUp={() => sceneRef.current?.setControls(0, 0)}
        onPointerCancel={() => sceneRef.current?.setControls(0, 0)}
      >
        {isReady && status !== null && (
          <div className="cockpit-hud">
            <div className="cockpit-hud-top">
              <span>
                {t('combat.enemy')}
                <span className="cockpit-health" aria-hidden="true">
                  <span style={{ width: `${status.enemyHealth}%` }} />
                </span>
              </span>
              <span>{t('combat.ammunition', { count: status.ammunition })}</span>
              <span>{clock}</span>
            </div>
            <div className="cockpit-gunsight" data-in-sight={status.sight.isInSight} aria-hidden="true" />
            <PilotHead sight={status.sight} />
            <button
              type="button"
              className="cockpit-fire"
              disabled={outcome !== null || status.ammunition === 0}
              onPointerDown={(event) => {
                event.stopPropagation()
                sceneRef.current?.setFiring(true)
              }}
              onPointerUp={() => sceneRef.current?.setFiring(false)}
              onPointerLeave={() => sceneRef.current?.setFiring(false)}
            >
              {t('combat.fire')}
            </button>
          </div>
        )}
        {!isReady && <p className="cockpit-message">{t('combat.starting')}</p>}
        {outcome !== null && (
          <div className="cockpit-result" data-outcome={outcome}>
            <strong>{t(`combat.${outcome}`)}</strong>
            <button type="button" className="go" onClick={onClose}>
              {t('duel.continue')}
            </button>
          </div>
        )}
      </div>
      <p className="duel-turn">{t('combat.controls')}</p>
    </GameWindow>
  )
}

export default CockpitCombatWindow
