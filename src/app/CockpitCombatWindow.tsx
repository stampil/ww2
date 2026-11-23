import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CockpitCombatScene } from '../three/CockpitCombatScene'
import type { CockpitEnemy, CockpitOutcome, CockpitStatus } from '../three/CockpitCombatScene'
import type { Livery } from '../three/liveries'
import GameWindow from './GameWindow'
import { useEngineSound } from './useEngineSound'
import type { Clan, FlightAlert } from './useBase'
import VirtualStick from './VirtualStick'

// Whom each side meets in the air: the Allies meet the Germans and Vichy, the Axe meets the French.
const ENEMIES: Record<Clan, CockpitEnemy[]> = { french: ['bf109', 'vichyD520'], axe: ['frenchD520'] }
const PERCENT = 100
const PERCENT_TO_SHARE = 0.01
const TOUCH_SCREEN_QUERY = '(pointer: coarse)'
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

type Props = {
  alert: FlightAlert
  /** The side of the player, which sets whom they meet, and the livery of their aircraft. */
  clan: Clan
  livery: Livery
  /** The maneuverability of the aircraft and the accuracy of the pilot: they set the turns and the width of the gunsight. */
  maneuverability: number
  accuracy: number
  /** The difficulty of the mission, from 1 to 3: it sets how long the enemy has to be kept in the gunsight, and in the easiest fight where it flies. */
  risk: number
  onStart: (alertId: number) => Promise<void>
  onFinish: (alertId: number, outcome: CockpitOutcome) => Promise<void>
  onClose: () => void
}

/**
 * A dogfight flown in real time from the cockpit, as in Wings: the player steers with the arrow keys or the stick under the view and keeps the enemy in the gunsight, which fires by itself,
 * while the head of the pilot in the cockpit turns toward the enemy. The browser plays it and tells the server how it ended.
 */
function CockpitCombatWindow({ alert, clan, livery, maneuverability, accuracy, risk, onStart, onFinish, onClose }: Props) {
  const { t } = useTranslation()
  const viewRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<CockpitCombatScene | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [status, setStatus] = useState<CockpitStatus | null>(null)
  const [outcome, setOutcome] = useState<CockpitOutcome | null>(null)
  const enemies = ENEMIES[clan]
  const enemy = enemies[alert.id % enemies.length]
  useEngineSound(isReady)

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
      { enemy, livery, agility: maneuverability * PERCENT_TO_SHARE, accuracy: accuracy * PERCENT_TO_SHARE, risk, isTouchScreen: window.matchMedia(TOUCH_SCREEN_QUERY).matches },
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
        x += STEERING_KEYS[code].x
        y += STEERING_KEYS[code].y
      })
      scene.setControls(x, y)
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (STEERING_KEYS[event.code] !== undefined) {
        event.preventDefault()
        pressed.add(event.code)
        steer()
      }
    }
    const onKeyUp = (event: KeyboardEvent): void => {
      pressed.delete(event.code)
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

  const secondsLeft = Math.ceil(status?.secondsLeft ?? 0)
  const clock = `${Math.floor(secondsLeft / SECONDS_PER_MINUTE)}:${String(secondsLeft % SECONDS_PER_MINUTE).padStart(2, '0')}`

  return (
    <GameWindow title={t('combat.title')} hint={t('combat.hint', { enemy: t(`combat.enemies.${enemy}`) })} onDismiss={onClose}>
      <div className="cockpit-view" ref={viewRef}>
        {isReady && status !== null && (
          <div className="cockpit-hud">
            <div className="cockpit-hud-top">
              <span>
                {t('combat.lock')}
                <span className="cockpit-lock" aria-hidden="true">
                  <span style={{ width: `${status.lockShare * PERCENT}%` }} />
                </span>
              </span>
              <span>{clock}</span>
            </div>
            <div className="cockpit-gunsight" style={{ height: `${status.sightDiameterPercent}%`, top: `${status.sightTopPercent}%` }} data-in-sight={status.sight.isInSight} aria-hidden="true" />
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
      <VirtualStick axes="both" onChange={(x, y) => sceneRef.current?.setControls(x, y)} />
    </GameWindow>
  )
}

export default CockpitCombatWindow
