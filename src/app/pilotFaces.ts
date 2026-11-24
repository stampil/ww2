import { assetUrl } from '../assetUrl'
import type { Clan } from './useBase'

// How many faces each sheet of portraits has; a pilot keeps the face their number gives them.
const PORTRAIT_COUNT = 8
// The name of the portraits of each side in public/sprites/pilots.
const FACE_NAMES: Record<Clan, string> = { french: 'pilot', axe: 'pilot-german' }

/** The picture of the face of a pilot of this side, in the style of the game: one of eight, always the same for the same pilot. */
export function pilotFaceUrl(pilotId: number, clan: Clan): string {
  return assetUrl(`sprites/pilots/${FACE_NAMES[clan]}-${(pilotId % PORTRAIT_COUNT) + 1}.png`)
}
