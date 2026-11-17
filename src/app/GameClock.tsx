import { useTranslation } from 'react-i18next'

// The game date follows no real time zone, so it is shown as the API wrote it.
const GAME_TIME_ZONE = 'UTC'

/** The game time, which runs as fast as real time and never stops. */
function GameClock({ gameTime }: { gameTime: Date }) {
  const { t, i18n } = useTranslation()
  const formatter = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'long', timeStyle: 'medium', timeZone: GAME_TIME_ZONE })

  return (
    <div className="game-clock">
      <span>{t('base.clock.label')}</span>
      <time dateTime={gameTime.toISOString()}>{formatter.format(gameTime)}</time>
    </div>
  )
}

export default GameClock
