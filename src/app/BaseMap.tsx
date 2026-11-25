import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { assetUrl } from '../assetUrl'
import AirfieldView from './AirfieldView'
import type { Arrival, Departure, Emergence } from './AirfieldView'
import Icon from './Icon'
import type { IconName } from './iconPaths'
import MaintenanceCrews from './MaintenanceCrews'
import ServiceVehicles from './ServiceVehicles'
import ZoomableView from './ZoomableView'
import type { BuildingName, Cell, PlacedSprite, TerrainPlan } from '../plans/terrainPlan'
import type { Livery } from '../three/liveries'
import { paintTiles } from '../three/patchImage'
import { loadTerrainTextures } from '../three/terrainTextures'

const TILE_PIXELS = 128
const SPRITES_PATH = 'sprites/buildings/'
const AIRCRAFT_WIDTH_TILES = 1.4

/** What shows on a parked aircraft: nothing when it is fit, else the trouble it is in. */
export type StandStatus = 'ready' | 'damaged' | 'inspecting' | 'repairing' | 'burning'
export type ParkedAircraft = { id: number; number: number; stand: Cell; status: StandStatus; livery: Livery }
/** Something that needs the player at a building: a marker over it, which opens it. */
export type MapAlert = { kind: 'mission' | 'fire' | 'guide' | 'blocked'; building: BuildingName; label: string }

const STATUS_ICONS: Record<Exclude<StandStatus, 'ready'>, IconName> = { damaged: 'warning', inspecting: 'reconnaissance', repairing: 'repair', burning: 'fire' }
const ALERT_ICONS: Record<MapAlert['kind'], IconName> = { mission: 'warning', fire: 'fire', guide: 'upgrade', blocked: 'supplies' }

type Props = {
  plan: TerrainPlan
  /** The aircraft being inspected or repaired: a mechanic walks to the hangar for each. */
  servicedAircraftIds: number[]
  /** The aircraft that burn, and those that have just landed: a fire engine or a fuel truck drives to each from the depot; the fuel truck says when it is done. */
  burningAircraftIds: number[]
  refuelingAircraftIds: number[]
  onRefueled: (aircraftId: number) => void
  /** The aircraft on the ground, each at its stand, and their picture seen from above, once it is drawn. */
  parkedAircraft: ParkedAircraft[]
  aircraftSprite: string | null
  /** The aircraft that take off, each from its stand, and what to do once one has flown off. */
  departures: Departure[]
  onDeparted: (aircraftId: number) => void
  /** The aircraft that land and taxi to their stands, and what to do once one has got there. */
  arrivals: Arrival[]
  /** The aircraft that come out of the hangar to a stand that has been freed; once one is there, the same call as for a landing. */
  emergences: Emergence[]
  onLanded: (aircraftId: number) => void
  alerts: MapAlert[]
  /** The buildings that a raid destroyed, which show in ruins until they are built again. */
  destroyedBuildings: string[]
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

/** The base seen from above, tilted a little: the tiles of its terrain plan, the sprites standing on them, the aircraft parked, taking off or landing, the mechanics at work and the alerts; a click on a building opens it. */
function BaseMap({ plan, servicedAircraftIds, burningAircraftIds, refuelingAircraftIds, onRefueled, parkedAircraft, aircraftSprite, departures, onDeparted, arrivals, emergences, onLanded, alerts, destroyedBuildings, openBuilding, onSelect }: Props) {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isCameraAway, setIsCameraAway] = useState(false)
  const [groundTransform, setGroundTransform] = useState('')
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
    <div className="base-map-viewport" style={gridSize}>
      <ZoomableView>
        <div className="base-map" role="group" aria-label={t('base.map')} data-three={aircraftSprite !== null} data-camera-away={isCameraAway}>
          <canvas className="base-map-canvas" ref={canvasRef} />
          {aircraftSprite !== null && (
            <AirfieldView
              plan={plan}
              departures={departures}
              arrivals={arrivals}
              emergences={emergences}
              aircraftWidthTiles={AIRCRAFT_WIDTH_TILES}
              parked={parkedAircraft.map((aircraft) => ({ stand: aircraft.stand, livery: aircraft.livery }))}
              ruins={plan.sprites.filter((sprite) => sprite.building !== undefined && destroyedBuildings.includes(sprite.building)).map((sprite) => sprite.sprite)}
              shadowImage={aircraftSprite}
              onDeparted={onDeparted}
              onLanded={onLanded}
              onCameraAway={setIsCameraAway}
              onFramed={setGroundTransform}
            />
          )}
          <div className="base-map-overlay" style={groundTransform === '' ? undefined : { transform: groundTransform }}>
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
                  data-destroyed={destroyedBuildings.includes(building)}
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
            <MaintenanceCrews plan={plan} servicedAircraftIds={servicedAircraftIds} parkedAircraft={parkedAircraft} />
            <ServiceVehicles plan={plan} parkedAircraft={parkedAircraft} burningAircraftIds={burningAircraftIds} refuelingAircraftIds={refuelingAircraftIds} onRefueled={onRefueled} />
          </div>
        </div>
      </ZoomableView>
    </div>
  )
}

export default BaseMap
