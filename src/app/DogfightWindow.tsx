import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import DogfightView from './DogfightView'
import GameWindow from './GameWindow'
import type { DuelBomber } from '../three/DogfightScene'
import type { Livery } from '../three/liveries'
import type { Clan, FlightAlert, Maneuver } from './useBase'

const MANEUVERS: Maneuver[] = ['accelerate', 'turnLeft', 'turnRight', 'slipLeft', 'slipRight']
// Whom each side meets on the grid: the Allies the German bombers, the Axe the French ones.
const BOMBERS: Record<Clan, DuelBomber[]> = { french: ['he111', 'ju87'], axe: ['amiot143', 'leo451'] }

type Props = {
  alert: FlightAlert
  /** The side of the player, which sets which bombers they meet, and the livery of their aircraft. */
  clan: Clan
  livery: Livery
  onStart: (alertId: number) => Promise<void>
  onPlay: (alertId: number, maneuver: Maneuver) => Promise<void>
  onClose: () => void
}

/**
 * A dogfight: the player attacks an enemy bomber from behind and plays one maneuver card per move; after the last move the bomber is shot down if it
 * stands in the firing cone, else it gets away. The dogfight begins when the window opens, and goes on from where it was if the window is closed and opened again.
 */
function DogfightWindow({ alert, clan, livery, onStart, onPlay, onClose }: Props) {
  const { t } = useTranslation()
  const [isPlaying, setIsPlaying] = useState(false)
  const state = alert.state
  const bombers = BOMBERS[clan]
  const bomber = bombers[alert.id % bombers.length]

  useEffect(() => {
    if (state === null) {
      void onStart(alert.id)
    }
    // A dogfight is started once, when its window opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alert.id])

  async function play(maneuver: Maneuver): Promise<void> {
    setIsPlaying(true)
    await onPlay(alert.id, maneuver)
    setIsPlaying(false)
  }

  const outcome = state?.outcome ?? null
  const canPlay = state !== null && outcome === null && !isPlaying

  return (
    <GameWindow title={t('duel.title')} hint={t('duel.hint', { moves: alert.moves, enemy: t(`duel.enemies.${bomber}`) })} onDismiss={onClose}>
      <DogfightView arenaSize={alert.arenaSize} bomber={bomber} livery={livery} view={state} />
      {outcome === null ? (
        <p className="duel-turn">{state === null ? '…' : t('duel.turn', { turn: state.turn + 1, moves: alert.moves })}</p>
      ) : (
        <div className="duel-result" data-outcome={outcome}>
          <strong>{t(`duel.${outcome}`)}</strong>
          <button type="button" className="go" onClick={onClose}>
            {t('duel.continue')}
          </button>
        </div>
      )}
      <ul className="duel-cards">
        {MANEUVERS.map((maneuver) => (
          <li key={maneuver}>
            <button type="button" className="duel-card" disabled={!canPlay} onClick={() => void play(maneuver)}>
              <strong>{t(`duel.maneuvers.${maneuver}`)}</strong>
              <span>{t(`duel.maneuverHints.${maneuver}`)}</span>
            </button>
          </li>
        ))}
      </ul>
    </GameWindow>
  )
}

export default DogfightWindow
