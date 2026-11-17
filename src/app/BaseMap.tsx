import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { assetUrl } from '../assetUrl'
import Icon from './Icon'
import type { IconName } from './iconPaths'
import MaintenanceCrew from './MaintenanceCrew'
import type { BuildingName, Cell, PlacedSprite, TerrainPlan } from '../plans/terrainPlan'
import { paintTiles } from '../three/patchImage'
import { loadTerrainTextures } from '../three/terrainTextures'

const TILE_PIXELS = 128
const SPRITES_PATH = 'sprites/buildings/'
const CREW_START_DELAY_MILLISECONDS = 1500
const AIRCRAFT_WIDTH_TILES = 1.4

/** What shows on a parked aircraft: nothing when it is fit, else the trouble it is in. */
export type StandStatus = 'ready' | 'damaged' | 'inspecting' | 'repairing' | 'burning'
export type ParkedAircraft = { id: number; stand: Cell; status: StandStatus }
/** Something that needs the player at a building: a marker over it, which opens it. */
export type MapAlert = { kind: 'mission' | 'fire' | 'guide'; building: BuildingName; label: string }

const STATUS_ICONS: Record<Exclude<StandStatus, 'ready'>, IconName> = { damaged: 'warning', inspecting: 'reconnaissance', repairing: 'repair', burning: 'fire' }
const ALERT_ICONS: Record<MapAlert['kind'], IconName> = { mission: 'warning', fire: 'fire', guide: 'upgrade' }

type Props = {
  plan: TerrainPlan
  /** The aircraft being inspected or repaired: a mechanic walks to the hangar for each. */
  servicedAircraftIds: number[]
  /** The aircraft on the ground, each at its stand, and their picture seen from above, once it is drawn. */
  parkedAircraft: ParkedAircraft[]
  aircraftSprite: string | null
  alerts: MapAlert[]
  openBuilding: BuildingName | null
  onSelect: (building: BuildingName) => void
}

function spriteUrl(sprite: PlacedSprite): string {
  return assetUrl(`${SPRITES_PATH}${sprite.sprite}.png`)
}

function placement(sprite: PlacedSprite): CSSProperties {
  return { '--row': sprite.row, '--column': sprite.column, '--width': sprite.widthTiles } as CSSProperties
}

function standPlacement(stand: Cell): CSSProperties {
  return { '--row': stand.row, '--column': stand.column, '--width': AIRCRAFT_WIDTH_TILES } as CSSProperties
}

/** The base seen from above: the tiles of its terrain plan, the sprites standing on them, the aircraft parked, the mechanics at work and the alerts; a click on a building opens it. */
function BaseMap({ plan, servicedAircraftIds, parkedAircraft, aircraftSprite, alerts, openBuilding, onSelect }: Props) {
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
        {aircraftSprite !== null &&
          parkedAircraft.map((aircraft) => (
            <button
              key={aircraft.id}
              type="button"
              className="map-aircraft"
              data-status={aircraft.status}
              style={standPlacement(aircraft.stand)}
              aria-label={t('base.hangar.parked')}
              onClick={() => onSelect('hangar')}
            >
              <img src={aircraftSprite} alt="" draggable={false} />
              {aircraft.status !== 'ready' && (
                <span className="map-aircraft-badge">
                  <Icon name={STATUS_ICONS[aircraft.status]} />
                </span>
              )}
            </button>
          ))}
        {alerts.map((alert) => {
          const sprite = plan.sprites.find((candidate) => candidate.building === alert.building)!
          return (
            <button
              key={alert.kind}
              type="button"
              className="map-alert"
              data-kind={alert.kind}
              style={placement(sprite)}
              aria-label={alert.label}
              onClick={() => onSelect(alert.building)}
            >
              <Icon name={ALERT_ICONS[alert.kind]} />
            </button>
          )
        })}
        {servicedAircraftIds.map((aircraftId, place) => (
          <MaintenanceCrew key={aircraftId} plan={plan} delayMilliseconds={place * CREW_START_DELAY_MILLISECONDS} />
        ))}
      </div>
    </div>
  )
}

export default BaseMap
