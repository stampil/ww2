import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { assetUrl } from '../assetUrl'
import MaintenanceCrew from './MaintenanceCrew'
import type { BuildingName, PlacedSprite, TerrainPlan } from '../plans/terrainPlan'
import { paintTiles } from '../three/patchImage'
import { loadTerrainTextures } from '../three/terrainTextures'

const TILE_PIXELS = 128
const SPRITES_PATH = 'sprites/buildings/'
const CREW_START_DELAY_MILLISECONDS = 1500

type Props = {
  plan: TerrainPlan
  /** The aircraft being repaired: a mechanic walks to the hangar for each. */
  repairingAircraftIds: number[]
  openBuilding: BuildingName | null
  onSelect: (building: BuildingName) => void
}

function spriteUrl(sprite: PlacedSprite): string {
  return assetUrl(`${SPRITES_PATH}${sprite.sprite}.png`)
}

function placement(sprite: PlacedSprite): CSSProperties {
  return { '--row': sprite.row, '--column': sprite.column, '--width': sprite.widthTiles } as CSSProperties
}

/** The base seen from above: the tiles of its terrain plan, the sprites standing on them and the mechanics at work; a click on a building opens it. */
function BaseMap({ plan, repairingAircraftIds, openBuilding, onSelect }: Props) {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gridSize = { '--rows': plan.tiles.length, '--columns': plan.tiles[0].length } as CSSProperties

  useEffect(() => {
    let isCurrent = true
    void loadTerrainTextures().then((textures) => {
      if (isCurrent) {
        paintTiles(canvasRef.current!, plan.tiles, textures, TILE_PIXELS)
      }
    })
    return () => {
      isCurrent = false
    }
  }, [plan])

  return (
    <div className="base-map-viewport">
      <div className="base-map" role="group" aria-label={t('base.map')} style={gridSize}>
        <canvas className="base-map-canvas" ref={canvasRef} />
        {plan.sprites.map((sprite) => {
          const building = sprite.building
          if (building === undefined) {
            return <img key={sprite.sprite} className="base-sprite" src={spriteUrl(sprite)} alt="" draggable={false} style={placement(sprite)} />
          }
          return (
            <button
              key={sprite.sprite}
              type="button"
              className="base-sprite"
              style={placement(sprite)}
              aria-pressed={openBuilding === building}
              aria-label={t(`base.building.${building}.name`)}
              onClick={() => onSelect(building)}
            >
              <img src={spriteUrl(sprite)} alt="" draggable={false} />
            </button>
          )
        })}
        {repairingAircraftIds.map((aircraftId, place) => (
          <MaintenanceCrew key={aircraftId} plan={plan} delayMilliseconds={place * CREW_START_DELAY_MILLISECONDS} />
        ))}
      </div>
    </div>
  )
}

export default BaseMap
