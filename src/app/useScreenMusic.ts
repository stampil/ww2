import { useEffect } from 'react'
import { music } from '../audio/MusicPlayer'
import type { ScreenTrack } from '../audio/MusicPlayer'

/** Plays the track of a screen in place of the general music while the component is on the screen. */
export function useScreenMusic(screen: ScreenTrack): void {
  useEffect(() => music.pushScreen(screen), [screen])
}
