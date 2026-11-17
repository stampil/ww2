/** How many aircraft leave together: the lead and one on each side behind it. */
export const GROUP_SIZE = 3
/** How long a group waits after its last aircraft has arrived, unless it is full. */
export const GROUP_WAIT_SECONDS = 10
/** How long after one aircraft of a group starts to roll the next one does. */
export const DEPARTURE_STAGGER_SECONDS = 0.5
// A new group reaches the slots only this long after the previous group has started to roll, so the slots are empty.
const CLEARANCE_SECONDS = 3

/** The aircraft waiting at the start of the runway to leave together; times are seconds on the clock of the scene. */
export class DepartureGroup {
  private readonly arrivals: number[]

  constructor(firstArrivalSeconds: number) {
    this.arrivals = [firstArrivalSeconds]
  }

  /** When the lead starts to roll: at once when the group is full, else after the wait that follows the last arrival. */
  get releaseSeconds(): number {
    const lastArrival = Math.max(...this.arrivals)
    return this.arrivals.length === GROUP_SIZE ? lastArrival : lastArrival + GROUP_WAIT_SECONDS
  }

  /** Whether an aircraft sent out at this time still finds the group waiting, with a slot free: the group then waits for it. */
  canTake(orderSeconds: number): boolean {
    return this.arrivals.length < GROUP_SIZE && orderSeconds < this.releaseSeconds
  }

  /** Takes one more aircraft in; returns the slot it stands in: 0 for the lead, then the right, then the left. */
  add(arrivalSeconds: number): number {
    this.arrivals.push(arrivalSeconds)
    return this.arrivals.length - 1
  }

  startSecondsOf(slot: number): number {
    return this.releaseSeconds + slot * DEPARTURE_STAGGER_SECONDS
  }
}

/** Where an aircraft stands and when it gets there: its group, its slot, and the time it arrives at it. */
export type Assignment = { group: DepartureGroup; slot: number; arrivalSeconds: number }

/** Puts each aircraft in the group that is still waiting, or in a new one when there is none or it would come too late. */
export class DepartureQueue {
  private latest: DepartureGroup | undefined

  /** The aircraft is sent out at `orderSeconds` and would reach the start of the runway at `naturalArrivalSeconds`; it arrives later if the slots are not yet empty. */
  join(orderSeconds: number, naturalArrivalSeconds: number): Assignment {
    if (this.latest !== undefined && this.latest.canTake(orderSeconds)) {
      return { group: this.latest, slot: this.latest.add(naturalArrivalSeconds), arrivalSeconds: naturalArrivalSeconds }
    }
    const slotsEmptySeconds = this.latest === undefined ? naturalArrivalSeconds : this.latest.releaseSeconds + CLEARANCE_SECONDS
    const arrivalSeconds = Math.max(naturalArrivalSeconds, slotsEmptySeconds)
    this.latest = new DepartureGroup(arrivalSeconds)
    return { group: this.latest, slot: 0, arrivalSeconds }
  }
}
