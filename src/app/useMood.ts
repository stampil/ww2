import { useEffect } from 'react'
import { music } from '../audio/MusicPlayer'
import type { Mood } from '../audio/moods'

/** Plays a mood of the music while the component is on the screen; none leaves the music as it is. */
export function useMood(mood: Mood | null): void {
  useEffect(() => {
    if (mood === null) {
      return
    }

    return music.pushMood(mood)
  }, [mood])
}
