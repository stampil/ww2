import { useTranslation } from 'react-i18next'

// The game date follows no real time zone, so it is shown as the API wrote it.
const GAME_TIME_ZONE = 'UTC'

type Props = {
  gameTime: Date
  paused: boolean
  onPausedChange: (paused: boolean) => void
}

/** The game time, which runs as fast as real time, and the button that pauses it. */
function GameClock({ gameTime, paused, onPausedChange }: Props) {
  const { t, i18n } = useTranslation()
  const formatter = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'long', timeStyle: 'medium', timeZone: GAME_TIME_ZONE })

  return (
    <div className="game-clock" role="group" aria-label={t('base.clock.label')}>
      <time dateTime={gameTime.toISOString()}>{formatter.format(gameTime)}</time>
      <button type="button" aria-pressed={paused} onClick={() => onPausedChange(!paused)}>
        {t('base.clock.pause')}
      </button>
    </div>
  )
}

export default GameClock
