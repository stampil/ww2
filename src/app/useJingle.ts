import { useEffect } from 'react'
import { music } from '../audio/MusicPlayer'
import type { Jingle } from '../audio/MusicPlayer'

/** Plays the jingle of a success or of a failure over the music while the component is on the screen; none leaves the music as it is. */
export function useJingle(jingle: Jingle | null): void {
  useEffect(() => {
    if (jingle === null) {
      return
    }

    return music.pushJingle(jingle)
  }, [jingle])
}
