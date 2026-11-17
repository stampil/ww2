import { useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { music } from '../audio/MusicPlayer'

/** Turns the music of the game on and off; the music goes on from page to page. */
function MusicToggle() {
  const { t } = useTranslation()
  const isPlaying = useSyncExternalStore(music.subscribe, () => music.isPlaying)

  return (
    <button type="button" className="music-toggle" aria-pressed={isPlaying} onClick={() => music.toggle()}>
      <span aria-hidden="true">♪</span> {t('music.label')}
    </button>
  )
}

export default MusicToggle
