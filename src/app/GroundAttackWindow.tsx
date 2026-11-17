import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { GroundAttackScene, STRAFE_REQUIRED_DESTROYED, STRAFE_VEHICLE_COUNT } from '../three/GroundAttackScene'
import type { StrafeOutcome, StrafeStatus } from '../three/GroundAttackScene'
import GameWindow from './GameWindow'
import { useAircraftSprite } from './useAircraftSprite'
import type { FlightAlert } from './useBase'

const SECONDS_PER_MINUTE = 60
const STEERING_KEYS: Record<string, number> = { ArrowLeft: -1, KeyA: -1, ArrowRight: 1, KeyD: 1 }

type Props = {
  alert: FlightAlert
  onStart: (alertId: number) => Promise<void>
  onFinish: (alertId: number, outcome: StrafeOutcome) => Promise<void>
  onClose: () => void
}

/**
 * A strafing run over a German convoy, as in Wings: the player steers the D.520 to one side or the other of the road, and its guns fire by themselves at what is ahead.
 * The browser plays it and tells the server how it ended.
 */
function GroundAttackWindow({ alert, onStart, onFinish, onClose }: Props) {
  const { t } = useTranslation()
  const viewRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<GroundAttackScene | null>(null)
  const aircraftSprite = useAircraftSprite()
  const [isReady, setIsReady] = useState(false)
  const [status, setStatus] = useState<StrafeStatus | null>(null)
  const [outcome, setOutcome] = useState<StrafeOutcome | null>(null)

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
    const scene = new GroundAttackScene(viewRef.current!, alert.id, aircraftSprite, setStatus, (result) => {
      setOutcome(result)
      void onFinish(alert.id, result)
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

  /** A finger or the mouse held on the view steers toward where it is: the further from the middle, the harder the turn. */
  function steerToward(event: ReactPointerEvent<HTMLDivElement>): void {
    const box = event.currentTarget.getBoundingClientRect()
    sceneRef.current?.setControls(((event.clientX - box.left) / box.width - 0.5) * 2)
  }

  const secondsLeft = Math.ceil(status?.secondsLeft ?? 0)
  const clock = `${Math.floor(secondsLeft / SECONDS_PER_MINUTE)}:${String(secondsLeft % SECONDS_PER_MINUTE).padStart(2, '0')}`

  return (
    <GameWindow
      title={t('strafe.title')}
      hint={t('strafe.hint', { required: STRAFE_REQUIRED_DESTROYED, total: STRAFE_VEHICLE_COUNT })}
      onDismiss={onClose}
    >
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
        onPointerUp={() => sceneRef.current?.setControls(0)}
        onPointerCancel={() => sceneRef.current?.setControls(0)}
      >
        {status !== null && (
          <div className="cockpit-hud">
            <div className="cockpit-hud-top">
              <span>{t('strafe.destroyed', { count: status.destroyed, total: STRAFE_VEHICLE_COUNT, required: STRAFE_REQUIRED_DESTROYED })}</span>
              <span>{clock}</span>
            </div>
          </div>
        )}
        {!(isReady && aircraftSprite !== null) && <p className="cockpit-message">{t('strafe.starting')}</p>}
        {outcome !== null && (
          <div className="cockpit-result" data-outcome={outcome}>
            <strong>{t(`strafe.${outcome}`)}</strong>
            <button type="button" className="go" onClick={onClose}>
              {t('duel.continue')}
            </button>
          </div>
        )}
      </div>
      <p className="duel-turn">{t('strafe.controls')}</p>
    </GameWindow>
  )
}

export default GroundAttackWindow
