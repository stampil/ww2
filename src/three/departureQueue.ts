/** The places of a group along the runway, from the rear, at the start of the roll, to the front. */
export const REAR_SLOT = 0
export const MIDDLE_SLOT = 1
const FRONT_SLOT = 2
// The place of each aircraft, in the order they come: the first at the rear, the second at the front, the third between them.
// The junction lies between the rear place and the middle one, so the second runs on to the front before the third takes the middle place, and none passes through one that came before it.
const SLOT_OF_ARRIVAL = [REAR_SLOT, FRONT_SLOT, MIDDLE_SLOT]

/** How many aircraft leave together. */
export const GROUP_SIZE = SLOT_OF_ARRIVAL.length
/** How long a group waits after its last aircraft has arrived, unless it is full. */
export const GROUP_WAIT_SECONDS = 10
/** How long after one aircraft of a group starts to roll the next one does. */
export const DEPARTURE_STAGGER_SECONDS = 0.5
// An aircraft reaches its place at least this long after the one before it: at the speed of taxiing, a longer way than an aircraft is long, so no two are on a taxiway together.
const ARRIVAL_SPACING_SECONDS = 2.5

/** The aircraft waiting on the runway to leave together, in their places along it; times are seconds on the clock of the scene. */
export class DepartureGroup {
  private readonly arrivals: number[]
  private readonly slots: number[]

  constructor(firstArrivalSeconds: number) {
    this.arrivals = [firstArrivalSeconds]
    this.slots = [SLOT_OF_ARRIVAL[0]]
  }

  /** How many aircraft the group has. */
  get size(): number {
    return this.arrivals.length
  }

  /** The place of the aircraft at the front, which the others stand behind: 0 is the rear. */
  get frontSlot(): number {
    return Math.max(...this.slots)
  }

  /** The place that the next aircraft to come takes. */
  get nextSlot(): number {
    return SLOT_OF_ARRIVAL[this.arrivals.length]
  }

  /** When the front aircraft starts to roll: at once when the group is full, else after the wait that follows the last arrival. */
  get releaseSeconds(): number {
    const lastArrival = Math.max(...this.arrivals)
    return this.arrivals.length === GROUP_SIZE ? lastArrival : lastArrival + GROUP_WAIT_SECONDS
  }

  /** Whether an aircraft sent out at this time still finds the group waiting, with a place free: the group then waits for it. */
  canTake(orderSeconds: number): boolean {
    return this.arrivals.length < GROUP_SIZE && orderSeconds < this.releaseSeconds
  }

  /** Takes one more aircraft in, in the next place, which it reaches no sooner than it could and no sooner than the spacing from the one before it allows. */
  add(naturalArrivalSeconds: number): { slot: number; arrivalSeconds: number } {
    const arrivalSeconds = Math.max(naturalArrivalSeconds, Math.max(...this.arrivals) + ARRIVAL_SPACING_SECONDS)
    const slot = this.nextSlot
    this.arrivals.push(arrivalSeconds)
    this.slots.push(slot)
    return { slot, arrivalSeconds }
  }

  /** The aircraft at the front rolls first, then the one behind it, half a second apart. */
  startSecondsOf(slot: number): number {
    let aircraftAhead = 0
    for (const other of this.slots) {
      if (other > slot) {
        aircraftAhead += 1
      }
    }

    return this.releaseSeconds + aircraftAhead * DEPARTURE_STAGGER_SECONDS
  }
}

/** Where an aircraft stands and when it gets there: its group, its place along the runway (0 at the rear), and the time it arrives at it. */
export type Assignment = { group: DepartureGroup; slot: number; arrivalSeconds: number }

/** Puts each aircraft in the group that is still waiting, or in a new one when there is none or it would come too late. */
export class DepartureQueue {
  private latest: DepartureGroup | undefined

  /** `clearanceSeconds` is how long after a group starts to roll the places are free of it, for the next group to come to them. */
  constructor(private readonly clearanceSeconds: number) {}

  /** The aircraft is sent out at `orderSeconds`; `naturalArrivalSecondsAt` tells when it would reach a place of the line, which depends on the way to it. */
  join(orderSeconds: number, naturalArrivalSecondsAt: (slot: number) => number): Assignment {
    if (this.latest !== undefined && this.latest.canTake(orderSeconds)) {
      return { group: this.latest, ...this.latest.add(naturalArrivalSecondsAt(this.latest.nextSlot)) }
    }
    const firstSlot = SLOT_OF_ARRIVAL[0]
    const naturalArrivalSeconds = naturalArrivalSecondsAt(firstSlot)
    const placesFreeSeconds = this.latest === undefined ? naturalArrivalSeconds : this.latest.releaseSeconds + this.clearanceSeconds
    const arrivalSeconds = Math.max(naturalArrivalSeconds, placesFreeSeconds)
    this.latest = new DepartureGroup(arrivalSeconds)

    return { group: this.latest, slot: firstSlot, arrivalSeconds }
  }
}
