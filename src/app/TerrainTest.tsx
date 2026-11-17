import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { paintTiles } from '../three/patchImage'
import { loadTerrainTextures } from '../three/terrainTextures'
import type { Tile } from '../three/tiles'

const PATCH_URL = '/api/terrain/patch'
const SEED_LIMIT = 2 ** 31

type Patch = { seed: number; tiles: Tile[][] }

/** A button that draws a square of tiles at random, each turned at random, laid end to end to judge how they look. */
function TerrainTest() {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [patch, setPatch] = useState<Patch | null>(null)
  const [hasFailed, setHasFailed] = useState(false)

  useEffect(() => {
    if (patch !== null) {
      void loadTerrainTextures().then((textures) => paintTiles(canvasRef.current!, patch.tiles, textures))
    }
  }, [patch])

  async function generate(): Promise<void> {
    const seed = Math.floor(Math.random() * SEED_LIMIT)
    try {
      const response = await fetch(`${PATCH_URL}?seed=${seed}`)
      setPatch((await response.json()) as Patch)
      setHasFailed(false)
    } catch {
      setHasFailed(true)
    }
  }

  return (
    <section className="terrain-test" aria-label={t('terrainTest.title')}>
      <div className="control-buttons">
        <button type="button" onClick={() => void generate()}>
          {t('terrainTest.generate')}
        </button>
      </div>
      {patch !== null && <canvas className="terrain-test-canvas" ref={canvasRef} />}
      {patch !== null && <p className="model-viewer-hint">{t('terrainTest.seed', { seed: patch.seed })}</p>}
      {hasFailed && <p className="account-error" role="alert">{t('account.errors.apiDown')}</p>}
    </section>
  )
}

export default TerrainTest
