import { useEffect, useState } from 'react'
import { aircraftSprite } from '../three/aircraftSprite'

/** The picture of the aircraft seen from above, once it is drawn; null before, and where WebGL is not there to draw it. */
export function useAircraftSprite(): string | null {
  const [sprite, setSprite] = useState<string | null>(null)

  useEffect(() => {
    let isCurrent = true
    aircraftSprite('french')
      .then((url) => {
        if (isCurrent) {
          setSprite(url)
        }
      })
      .catch(() => undefined)
    return () => {
      isCurrent = false
    }
  }, [])

  return sprite
}
