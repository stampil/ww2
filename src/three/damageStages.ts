/** The damage the aircraft takes, one level per click, from intact (0) to destroyed. */
export const DESTROYED_LEVEL = 8

/** The level of damage to show on an aircraft that has lost part of its durability: none when intact, never as far as destroyed. */
export function damageLevelOf(durability: number, maxDurability: number): number {
  return Math.round((1 - durability / maxDurability) * (DESTROYED_LEVEL - 1))
}

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
