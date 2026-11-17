function firstFreeStand(taken: Set<number>, standCount: number): number | undefined {
  for (let stand = 0; stand < standCount; stand += 1) {
    if (!taken.has(stand)) {
      return stand
    }
  }
  return undefined
}

/**
 * Where each aircraft on the ground stands, as the number of a stand: it keeps the stand it had, else the stand of its own place in the squadron if that one is free, else the first free one.
 * An aircraft in flight leaves its stand free, and one that finds no stand free stays out of sight until one is.
 */
export function assignStands(aircraftIds: number[], busyIds: number[], standCount: number, previous: Map<number, number>): Map<number, number> {
  const onGround = aircraftIds.filter((aircraftId) => !busyIds.includes(aircraftId))
  const assigned = new Map<number, number>()
  const taken = new Set<number>()
  for (const aircraftId of onGround) {
    const kept = previous.get(aircraftId)
    if (kept !== undefined) {
      assigned.set(aircraftId, kept)
      taken.add(kept)
    }
  }
  for (const aircraftId of onGround) {
    if (assigned.has(aircraftId)) {
      continue
    }
    const place = aircraftIds.indexOf(aircraftId)
    const stand = place < standCount && !taken.has(place) ? place : firstFreeStand(taken, standCount)
    if (stand !== undefined) {
      assigned.set(aircraftId, stand)
      taken.add(stand)
    }
  }
  return assigned
}
