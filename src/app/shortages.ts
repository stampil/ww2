import type { BusyCrews } from './flights'
import type { Base, Offer, Part, Pilot, Aircraft, Squadron, Stock, UpgradeInfo } from './useBase'

/** The key of the text of an error code of the API. */
export function refusalKey(code: string): string {
  return `base.errors.${code}`
}

/**
 * What the API would refuse an order for, read off what the screen shows: the key of the text that says so, or null when nothing stops it.
 * The API still has the last word; these tell the player before the click, where the button is.
 */

export function purchaseShortage(resources: Base['resources'], warehouse: Base['warehouse'], stock: Stock, quantity: number): string | null {
  if (resources.supplies < warehouse.prices[stock] * quantity) {
    return refusalKey('insufficientSupplies')
  }
  if (resources[stock] + quantity > warehouse.capacity) {
    return refusalKey('warehouseFull')
  }
  return null
}

export function productionShortage(workshop: Base['workshop'], materialCost: number, withMechanic: boolean, materials: number): string | null {
  if (workshop.jobs.length >= workshop.benches) {
    return refusalKey('workshopBusy')
  }
  if (withMechanic && workshop.freeMechanics < 1) {
    return refusalKey('noMechanicFree')
  }
  if (materials < materialCost) {
    return refusalKey('insufficientMaterials')
  }
  return null
}

export function rebuildAircraftShortage(workshop: Base['workshop']): string | null {
  if (workshop.freeMechanics < 1) {
    return refusalKey('noMechanicFree')
  }
  return workshop.parts.every((part) => workshop.readyParts[part.part] > 0) ? null : refusalKey('missingSparePart')
}

export function recruitMechanicShortage(workshop: Base['workshop'], supplies: number): string | null {
  if (workshop.mechanics.length >= workshop.mechanicRecruitment.max) {
    return refusalKey('tooManyMechanics')
  }
  return supplies < workshop.mechanicRecruitment.cost ? refusalKey('insufficientSupplies') : null
}

export function inspectShortage(workshop: Base['workshop']): string | null {
  return workshop.freeMechanics < 1 ? refusalKey('noMechanicFree') : null
}

export function repairShortage(workshop: Base['workshop'], destroyedModules: Part[]): string | null {
  if (workshop.freeMechanics < 1) {
    return refusalKey('noMechanicFree')
  }
  if (destroyedModules.some((part) => workshop.readyParts[part] < 1)) {
    return refusalKey('missingSparePart')
  }
  return null
}

export function recruitShortage(pilotCount: number, recruitment: Base['roster']['recruitment'], supplies: number): string | null {
  if (pilotCount >= recruitment.maxPilots) {
    return refusalKey('tooManyPilots')
  }
  if (supplies < recruitment.cost) {
    return refusalKey('insufficientSupplies')
  }
  return null
}

export function upgradeShortage(info: UpgradeInfo, commandPoints: number): string | null {
  if (info.cost !== null && commandPoints < info.cost) {
    return refusalKey('insufficientCommandPoints')
  }
  return null
}

export function rebuildShortage(materials: number, cost: number): string | null {
  return materials < cost ? refusalKey('insufficientMaterials') : null
}

/** The pilots and the aircraft that are free to fly a mission: those that are not busy, and the aircraft of the category the mission asks for. */
export function freeCrewOf(offer: Offer, squadron: Squadron, busy: BusyCrews): { freePilots: Pilot[]; freeAircraft: Aircraft[] } {
  return {
    freePilots: squadron.pilots.filter((pilot) => !busy.pilotIds.includes(pilot.id)),
    freeAircraft: squadron.aircraft.filter((aircraft) => !busy.aircraftIds.includes(aircraft.id) && (offer.category === null || aircraft.model.category === offer.category)),
  }
}

/** Whether there are not enough free aircraft or pilots for the places of a mission. */
export function crewShortage(offer: Offer, squadron: Squadron, busy: BusyCrews): string | null {
  const { freePilots, freeAircraft } = freeCrewOf(offer, squadron, busy)
  if (freeAircraft.length < offer.aircraftCount) {
    return 'base.mission.noFreeAircraft'
  }
  if (freePilots.length < offer.aircraftCount) {
    return 'base.mission.notEnoughPilots'
  }
  return null
}

/** Whether the stocks cannot give the fuel and the ammunition of every aircraft of the mission. */
export function loadShortage(offer: Offer, resources: Base['resources'], fuel: number, ammunition: number): string | null {
  if (resources.fuel < fuel * offer.aircraftCount) {
    return refusalKey('insufficientFuel')
  }
  if (resources.ammunition < ammunition * offer.aircraftCount) {
    return refusalKey('insufficientAmmunition')
  }
  return null
}
