import type { BuildingName } from '../plans/terrainPlan'
import type { GuideStatus } from './useGuideStatus'
import type { Flight, HangarAircraft } from './useBase'

/** The steps of the first day. Each is told by the state of the base, so that doing what it asks moves the guide on. */
export type GuideStep = 'welcome' | 'launch' | 'fly' | 'receive' | 'maintenance' | 'free'
export type GuideContext = { flights: Flight[]; eventCount: number; hangarAircraft: HangarAircraft[] }

/** Where each step leads the player: the windows where the guide speaks too, and the building a gold arrow points at. */
const STEP_PLACES: Partial<Record<GuideStep, { windows: BuildingName[]; marker?: BuildingName }>> = {
  launch: { windows: ['controlTower'], marker: 'controlTower' },
  fly: { windows: ['controlTower'] },
  receive: { windows: ['controlTower'] },
  maintenance: { windows: ['hangar', 'workshop'], marker: 'hangar' },
}

function needsMaintenance(hangarAircraft: HangarAircraft[]): boolean {
  return hangarAircraft.some(
    (state) => state.needsInspection || (state.destroyedModules ?? []).length > 0 || state.repairSeconds !== null || state.fireSeconds !== null,
  )
}

/** The step the player is at, or null when the guide is over. */
export function guideStepOf(status: GuideStatus, context: GuideContext): GuideStep | null {
  if (status === 'over') {
    return null
  }
  if (status === 'new') {
    return 'welcome'
  }
  if (context.flights.length === 0 && context.eventCount === 0) {
    return 'launch'
  }
  if (context.flights.some((flight) => flight.remainingSeconds === 0)) {
    return 'receive'
  }
  if (context.flights.length > 0) {
    return 'fly'
  }
  return needsMaintenance(context.hangarAircraft) ? 'maintenance' : 'free'
}

/** Whether the guide speaks in the window of a building: when the step is about it. */
export function speaksInWindowOf(step: GuideStep, building: BuildingName): boolean {
  return STEP_PLACES[step]?.windows.includes(building) ?? false
}

/** The building that a gold arrow points at on the map, if the step has one. */
export function markedBuildingOf(step: GuideStep): BuildingName | undefined {
  return STEP_PLACES[step]?.marker
}
