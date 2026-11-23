import type { TargetNationality } from '../three/GroundRunScene'
import type { Clan } from './useBase'

/** Whose vehicles each side meets on the ground: the Allies the German ones, the Axe the French ones. */
export const TARGET_NATIONALITIES: Record<Clan, TargetNationality> = { french: 'german', axe: 'french' }
