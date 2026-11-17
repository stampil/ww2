import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { paintTiles } from '../three/patchImage'
import { loadTerrainTextures } from '../three/terrainTextures'
import { TilePatchGenerator } from '../three/TilePatchGenerator'
import type { TilePatch } from '../three/TilePatchGenerator'

const SEED_LIMIT = 2 ** 31

/** A button that draws a square of tiles at random, each turned at random, laid end to end to judge how they look. */
function TerrainTest() {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [patch, setPatch] = useState<TilePatch | null>(null)

  useEffect(() => {
    if (patch !== null) {
      void loadTerrainTextures().then((textures) => paintTiles(canvasRef.current!, patch.tiles, textures))
    }
  }, [patch])

  function generate(): void {
    setPatch(new TilePatchGenerator().generate(Math.floor(Math.random() * SEED_LIMIT)))
  }

  return (
    <section className="terrain-test" aria-label={t('terrainTest.title')}>
      <div className="control-buttons">
        <button type="button" onClick={generate}>
          {t('terrainTest.generate')}
        </button>
      </div>
      {patch !== null && <canvas className="terrain-test-canvas" ref={canvasRef} />}
      {patch !== null && <p className="model-viewer-hint">{t('terrainTest.seed', { seed: patch.seed })}</p>}
    </section>
  )
}

export default TerrainTest
