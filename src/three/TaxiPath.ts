import * as THREE from 'three'

/** A path over the ground made of straight stretches between points, in world meters. */
export class TaxiPath {
  readonly lengthMeters: number
  private readonly distances = [0]

  constructor(private readonly points: THREE.Vector2[]) {
    for (let index = 1; index < points.length; index += 1) {
      this.distances.push(this.distances[index - 1] + points[index - 1].distanceTo(points[index]))
    }
    this.lengthMeters = this.distances[this.distances.length - 1]
  }

  /** Where one stands after a distance along the path; before the start and past the end one stays at the ends. */
  pointAt(distanceMeters: number): THREE.Vector2 {
    const clamped = Math.min(Math.max(distanceMeters, 0), this.lengthMeters)
    let index = 1
    while (index < this.distances.length - 1 && this.distances[index] < clamped) {
      index += 1
    }
    const share = (clamped - this.distances[index - 1]) / (this.distances[index] - this.distances[index - 1])
    return this.points[index - 1].clone().lerp(this.points[index], share)
  }

  /** The way the path runs around a distance, taken from a little before to a little after, so it turns smoothly at the corners. */
  headingAt(distanceMeters: number, spanMeters: number): number {
    const from = this.pointAt(distanceMeters - spanMeters)
    const to = this.pointAt(distanceMeters + spanMeters)
    return Math.atan2(to.y - from.y, to.x - from.x)
  }
}
