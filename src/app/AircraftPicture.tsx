import { useEffect, useRef } from 'react'
import { AircraftPreviewScene } from '../three/AircraftPreviewScene'

type Props = {
  /** In flight the aircraft is shown from the side in a sky; on the ground it is shown from above and can be turned by dragging. */
  isFlying: boolean
  damageLevel: number
  /** The aircraft's own number: it places the bushes of its parking pad, so the same card always looks the same. */
  aircraftId: number
  /** The number painted on the fin of the aircraft. */
  tailNumber: number
}

/** The aircraft of a card of the hangar, in 3D, with the damage it really has. It owns a WebGL scene, freed when the card goes. */
function AircraftPicture({ isFlying, damageLevel, aircraftId, tailNumber }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const scene = new AircraftPreviewScene(containerRef.current!, isFlying ? 'flight' : 'ground', damageLevel, aircraftId, tailNumber)
    return () => scene.dispose()
  }, [isFlying, damageLevel, aircraftId, tailNumber])

  return <div className="aircraft-picture" data-flying={isFlying} ref={containerRef} />
}

export default AircraftPicture
