import { useEffect, useRef, useState } from 'react'
import { assetUrl } from '../assetUrl'
import { AircraftPreviewScene } from '../three/AircraftPreviewScene'
import type { Livery } from '../three/liveries'

type Props = {
  /** On a mission the aircraft is in the air and cannot be inspected: it shows as an aircraft in flight and never becomes 3D. */
  isFlying: boolean
  /** Whether the aircraft is shown in 3D, to turn by dragging, which loads its model: only once it is being inspected. */
  isInteractive: boolean
  damageLevel: number
  /** The number painted on the fin of the aircraft in 3D. */
  tailNumber: number
  livery: Livery
}

/**
 * The aircraft of a card of the hangar: a JPEG picture, of an aircraft in flight on a mission, and from above on the ground with the damage it really has.
 * When it is inspected the picture stays until the 3D scene is drawn, which owns a WebGL scene, freed when the card goes, then gives way to it.
 */
function AircraftPicture({ isFlying, isInteractive, damageLevel, tailNumber, livery }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isSceneShown, setIsSceneShown] = useState(false)
  const hasScene = isInteractive && !isFlying

  useEffect(() => {
    if (!hasScene) {
      return
    }
    let isCancelled = false
    const scene = new AircraftPreviewScene(containerRef.current!, damageLevel, tailNumber, livery)
    // The next frame, so that the scene has been drawn with its damage before the picture goes.
    void scene.ready.then(() =>
      requestAnimationFrame(() => {
        if (!isCancelled) {
          setIsSceneShown(true)
        }
      }),
    )
    return () => {
      isCancelled = true
      setIsSceneShown(false)
      scene.dispose()
    }
  }, [hasScene, damageLevel, tailNumber, livery])

  const pictureUrl = isFlying ? assetUrl(`sprites/hangar/flight-${livery}.jpg`) : assetUrl(`sprites/hangar/ground-${livery}-${damageLevel}.jpg`)

  return (
    <div className="aircraft-picture" data-scene-shown={isSceneShown}>
      <img src={pictureUrl} alt="" />
      {hasScene && <div className="aircraft-scene" ref={containerRef} />}
    </div>
  )
}

export default AircraftPicture
