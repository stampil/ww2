import type { BusyCrews } from './flights'
import { crewShortage } from './shortages'
import type { AwayAircraft, Base, Flight, HangarAircraft, Offer, Part, Rest, Stock, Wreck } from './useBase'

/** What goes on in the camp, as the screen counts it down, and the pilots and aircraft that cannot fly a mission now. */
export type CampActivity = {
  flights: Flight[]
  rests: Rest[]
  away: AwayAircraft[]
  jobs: Base['workshop']['jobs']
  hangarAircraft: HangarAircraft[]
  hangarWrecks: Wreck[]
  unavailable: BusyCrews
}

/** Whether time alone is moving the camp on: a flight, a rest, an aircraft away, a part in the making, an inspection, a repair or a rebuild. */
function isSomethingGoingOn(activity: CampActivity): boolean {
  if (activity.flights.length > 0 || activity.rests.length > 0 || activity.away.length > 0 || activity.jobs.length > 0) {
    return true
  }
  for (const state of activity.hangarAircraft) {
    if (state.inspectionSeconds !== null || state.repairSeconds !== null) {
      return true
    }
  }
  for (const wreck of activity.hangarWrecks) {
    if (wreck.rebuildSeconds !== null) {
      return true
    }
  }
  return false
}

/** The supplies it takes to buy what the stock of a resource lacks of an amount. */
function purchaseCost(base: Base, stock: Stock, amount: number): number {
  return Math.max(0, amount - base.resources[stock]) * base.warehouse.prices[stock]
}

function launchCost(base: Base, offer: Offer): number {
  return purchaseCost(base, 'fuel', offer.fuelPerAircraft * offer.aircraftCount) + purchaseCost(base, 'ammunition', offer.ammunitionPerAircraft * offer.aircraftCount)
}

/** The supplies the next step toward a repair or a rebuild costs: nothing when every spare part is ready, else the materials of the cheapest part that is not. */
function partsStepCost(base: Base, parts: Part[]): number {
  let cheapest: number | null = null
  for (const entry of base.workshop.parts) {
    if (parts.includes(entry.part) && base.workshop.readyParts[entry.part] < 1) {
      const cost = purchaseCost(base, 'materials', entry.materialCost)
      if (cheapest === null || cost < cheapest) {
        cheapest = cost
      }
    }
  }
  return cheapest ?? 0
}

/** What each step that could bring an aircraft nearer to the air costs in supplies: a launch, an inspection, a repair, a rebuild, a first pilot. */
function stepCosts(base: Base, activity: CampActivity): number[] {
  const costs: number[] = []
  for (const offer of base.headquarters.offers) {
    if (crewShortage(offer, base.squadron, activity.unavailable) === null) {
      costs.push(launchCost(base, offer))
    }
  }
  if (base.squadron.pilots.length === 0) {
    costs.push(base.roster.recruitment.cost)
  }
  for (const state of activity.hangarAircraft) {
    const destroyedModules = state.destroyedModules ?? []
    if (state.needsInspection) {
      costs.push(0)
    } else if (state.fireSeconds !== null || destroyedModules.length > 0) {
      costs.push(partsStepCost(base, destroyedModules))
    }
  }
  if (activity.hangarWrecks.length > 0) {
    costs.push(partsStepCost(base, base.workshop.parts.map((entry) => entry.part)))
  }
  return costs
}

/**
 * When the camp is stuck, nothing going on and no step toward the air that its supplies can pay, the minutes the supplies the front sends take to pay for the cheapest one; null while it is not stuck.
 * A camp with no step at all to price is not called stuck: nothing is said that is not known.
 */
export function minutesBeforeFlight(base: Base, activity: CampActivity): number | null {
  if (isSomethingGoingOn(activity)) {
    return null
  }
  const costs = stepCosts(base, activity)
  if (costs.length === 0) {
    return null
  }
  const cheapest = Math.min(...costs)
  if (cheapest <= base.resources.supplies) {
    return null
  }
  return Math.ceil((cheapest - base.resources.supplies) / base.supplyIncome)
}
