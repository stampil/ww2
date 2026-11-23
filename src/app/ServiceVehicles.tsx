import { useCallback, useEffect, useState } from 'react'
import type { Cell, TerrainPlan } from '../plans/terrainPlan'
import type { ParkedAircraft } from './BaseMap'
import ServiceVehicle from './ServiceVehicle'
import type { ServiceVehicleKind } from './ServiceVehicle'

const VEHICLE_START_DELAY_MILLISECONDS = 2500
const FUEL_STAY_MILLISECONDS = 5000
// How long each vehicle is on the map, in tiles, from end to end: aircraft are drawn a good deal larger than their real size, and so are the vehicles.
const LENGTH_TILES: Record<ServiceVehicleKind, number> = { 'fuel-truck': 1.1, 'fire-engine': 1.2 }

type Visit = { key: string; kind: ServiceVehicleKind; aircraftId: number; stand: Cell; delayMilliseconds: number }

type Props = {
  plan: TerrainPlan
  parkedAircraft: ParkedAircraft[]
  /** The aircraft that burn: a fire engine goes to each and stays while the fire lasts. */
  burningAircraftIds: number[]
  /** The aircraft that have just landed: a fuel truck fills each one up. */
  refuelingAircraftIds: number[]
  onRefueled: (aircraftId: number) => void
}

/** The fire engines that go to the aircraft that burn, and the fuel trucks that go to those that have landed, each from the depot to the stand and back. */
function ServiceVehicles({ plan, parkedAircraft, burningAircraftIds, refuelingAircraftIds, onRefueled }: Props) {
  const [visits, setVisits] = useState<Visit[]>([])
  const removeVisit = useCallback(
    (visit: Visit) => {
      setVisits((current) => current.filter((candidate) => candidate.key !== visit.key))
      if (visit.kind === 'fuel-truck') {
        onRefueled(visit.aircraftId)
      }
    },
    [onRefueled],
  )

  useEffect(() => {
    setVisits((current) => {
      const added: Visit[] = []
      const wanted: [ServiceVehicleKind, number[]][] = [
        ['fire-engine', burningAircraftIds],
        ['fuel-truck', refuelingAircraftIds],
      ]
      for (const [kind, aircraftIds] of wanted) {
        for (const aircraftId of aircraftIds) {
          const key = `${kind}-${aircraftId}`
          const parked = parkedAircraft.find((candidate) => candidate.id === aircraftId)
          if (parked !== undefined && !current.some((visit) => visit.key === key)) {
            added.push({ key, kind, aircraftId, stand: parked.stand, delayMilliseconds: (current.length + added.length) * VEHICLE_START_DELAY_MILLISECONDS })
          }
        }
      }
      return added.length === 0 ? current : [...current, ...added]
    })
  }, [burningAircraftIds, refuelingAircraftIds, parkedAircraft])

  return visits.map((visit) => (
    <ServiceVehicle
      key={visit.key}
      plan={plan}
      kind={visit.kind}
      depot="warehouse"
      stand={visit.stand}
      lengthTiles={LENGTH_TILES[visit.kind]}
      delayMilliseconds={visit.delayMilliseconds}
      stayMilliseconds={visit.kind === 'fuel-truck' ? FUEL_STAY_MILLISECONDS : undefined}
      isStaying={visit.kind === 'fire-engine' && burningAircraftIds.includes(visit.aircraftId)}
      onGone={() => removeVisit(visit)}
    />
  ))
}

export default ServiceVehicles
