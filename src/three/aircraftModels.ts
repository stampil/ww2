import type { AircraftModel3D } from './aircraftModel'
import { Bf109Model } from './Bf109Model'
import { D520Model } from './D520Model'
import type { Livery } from './liveries'

/** The 3D model of the aircraft that wears this livery: each livery is the paint of one type of aircraft. */
export function createAircraftModel(livery: Livery): AircraftModel3D {
  if (livery === 'luftwaffe') {
    return new Bf109Model()
  }
  return new D520Model()
}
