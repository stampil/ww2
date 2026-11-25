import { useEffect, useRef } from 'react'
import { CrashScene } from '../three/CrashScene'
import type { Livery } from '../three/liveries'

/** An aircraft that does not come back falls and blows up on open grass, in 3D; it owns a WebGL scene, freed when the window goes. */
function CrashPicture({ livery }: { livery: Livery }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const scene = new CrashScene(containerRef.current!, livery)

    return () => scene.dispose()
  }, [livery])

  return <div className="crash-picture" ref={containerRef} />
}

export default CrashPicture
