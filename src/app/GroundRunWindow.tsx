import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { windDirectionOf } from '../three/GroundRunScene'
import type { GroundRunScene, RunEnd, RunOutcome, TargetNationality } from '../three/GroundRunScene'
import type { Livery } from '../three/liveries'
import GameWindow from './GameWindow'
import { TARGET_NATIONALITIES } from './targetNationality'
import { useAircraftSprite } from './useAircraftSprite'
import { useEngineSound } from './useEngineSound'
import type { Clan, FlightAlert } from './useBase'
import VirtualStick from './VirtualStick'

// Under this wind, in km/h, the run says nothing of it.
const CALM_WIND_KPH = 10
const STEERING_KEYS: Record<string, number> = { ArrowLeft: -1, KeyA: -1, ArrowRight: 1, KeyD: 1 }

export type GroundRunProps = {
  alert: FlightAlert
  /** The side of the player, which sets whose vehicles are on the ground, and the livery of their aircraft. */
  clan: Clan
  livery: Livery
  /** The wind the flight left in, in km/h, which pushes the aircraft across the road. */
  windSpeed: number
  onStart: (alertId: number) => Promise<void>
  onFinish: (alertId: number, end: RunEnd) => Promise<void>
  onClose: () => void
}

type Props<Status> = GroundRunProps & {
  /** The prefix of the texts of the mini-game: its title, hint, controls, and the three ends. */
  namespace: 'strafe' | 'photo'
  hintValues: Record<string, number | string>
  createScene: (
    view: HTMLElement,
    seed: number,
    shadowImage: string,
    livery: Livery,
    nationality: TargetNationality,
    windSpeed: number,
    onStatus: (status: Status) => void,
    onEnd: (end: RunEnd) => void,
  ) => GroundRunScene<Status>
  renderStatus: (status: Status) => ReactNode
}

/**
 * A mini-game flown from above, as in Wings: the player steers the D.520 to one side or the other, with the arrow keys or the stick under the view, and the rules of the scene do the rest.
 * The browser plays it and tells the server how it ended.
 */
function GroundRunWindow<Status>({ alert, clan, livery, windSpeed, namespace, hintValues, createScene, renderStatus, onStart, onFinish, onClose }: Props<Status>) {
  const { t } = useTranslation()
  const viewRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<GroundRunScene<Status> | null>(null)
  const aircraftSprite = useAircraftSprite()
  const [isReady, setIsReady] = useState(false)
  const [status, setStatus] = useState<Status | null>(null)
  const [outcome, setOutcome] = useState<RunOutcome | null>(null)
  useEngineSound(isReady && aircraftSprite !== null)

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
    // The run is started once, when its window opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alert.id])

  useEffect(() => {
    if (!isReady || aircraftSprite === null) {
      return
    }
    const scene = createScene(viewRef.current!, alert.id, aircraftSprite, livery, TARGET_NATIONALITIES[clan], windSpeed, setStatus, (end) => {
      setOutcome(end.outcome)
      void onFinish(alert.id, end)
    })
    sceneRef.current = scene
    const pressed = new Set<string>()
    const steer = (): void => {
      let x = 0
      pressed.forEach((code) => {
        x += STEERING_KEYS[code]
      })
      scene.setControls(x)
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
    // The scene is made once, when the run is started and the picture of the aircraft is drawn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, aircraftSprite])

  return (
    <GameWindow title={t(`${namespace}.title`)} hint={t(`${namespace}.hint`, hintValues)} onDismiss={onClose}>
      <div className="cockpit-view" ref={viewRef}>
        {status !== null && (
          <div className="cockpit-hud">
            <div className="cockpit-hud-top">
              {renderStatus(status)}
              {windSpeed >= CALM_WIND_KPH && <span>{t('wind.pushes', { speed: windSpeed, side: t(windDirectionOf(alert.id) > 0 ? 'wind.right' : 'wind.left') })}</span>}
            </div>
          </div>
        )}
        {!(isReady && aircraftSprite !== null) && <p className="cockpit-message">{t(`${namespace}.starting`)}</p>}
        {outcome !== null && (
          <div className="cockpit-result" data-outcome={outcome}>
            <strong>{t(`${namespace}.${outcome}`)}</strong>
            <button type="button" className="go" onClick={onClose}>
              {t('duel.continue')}
            </button>
          </div>
        )}
      </div>
      <p className="duel-turn">{t(`${namespace}.controls`)}</p>
      <VirtualStick axes="horizontal" onChange={(x) => sceneRef.current?.setControls(x)} />
    </GameWindow>
  )
}

export default GroundRunWindow
