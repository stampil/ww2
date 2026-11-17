/** The damage the aircraft takes, one level per click, from intact (0) to destroyed. */
export const DESTROYED_LEVEL = 8

export type DamageStage = 'none' | 'bullets' | 'shrapnel' | 'wrecked' | 'destroyed'

const FIRST_SHRAPNEL_LEVEL = 4
const FIRST_WRECKED_LEVEL = 6

export function damageStage(level: number): DamageStage {
  if (level >= DESTROYED_LEVEL) {
    return 'destroyed'
  }
  if (level >= FIRST_WRECKED_LEVEL) {
    return 'wrecked'
  }
  if (level >= FIRST_SHRAPNEL_LEVEL) {
    return 'shrapnel'
  }
  if (level > 0) {
    return 'bullets'
  }
  return 'none'
}
