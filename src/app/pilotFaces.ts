import { assetUrl } from '../assetUrl'

// How many faces the sheet of portraits has; a pilot keeps the face their number gives them.
const PORTRAIT_COUNT = 8

/** The picture of the face of a pilot in the style of the game: one of eight, always the same for the same pilot. */
export function pilotFaceUrl(pilotId: number): string {
  return assetUrl(`sprites/pilots/pilot-${(pilotId % PORTRAIT_COUNT) + 1}.png`)
}
