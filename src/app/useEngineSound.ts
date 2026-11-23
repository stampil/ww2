import { useEffect } from 'react'
import { effects } from '../audio/SoundEffects'

/** The engine of the aircraft, over and over, while the mini-game flown from above or from the cockpit is under way; it plays only while the music is on. */
export function useEngineSound(isFlying: boolean): void {
  useEffect(() => {
    if (!isFlying) {
      return
    }
    const sound = effects.loop('engine')
    return () => sound.stop()
  }, [isFlying])
}
