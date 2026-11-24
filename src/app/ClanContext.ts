import { createContext, useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { assetUrl } from '../assetUrl'
import type { Clan } from './useBase'

/** The side of the base the player looks at: the ranks and the medals carry the names of its army. */
export const ClanContext = createContext<Clan | null>(null)

/** The side of the base the player looks at. */
export function useClan(): Clan {
  return useContext(ClanContext)!
}

/** The name of a rank, in the uniform of the side of the base. */
export function useRankName(): (rank: number) => string {
  const { t } = useTranslation()
  const clan = useClan()

  return (rank) => t(`squadron.ranks.${clan}.${rank}`)
}

/** A medal, by its place among the three a pilot can earn, on the side of the base: its name and its picture. */
export function useMedal(): (medal: number) => { name: string; image: string } {
  const { t } = useTranslation()
  const clan = useClan()

  return (medal) => ({ name: t(`squadron.medals.${clan}.${medal}`), image: assetUrl(`sprites/medals/medal-${clan}-${medal}.png`) })
}
