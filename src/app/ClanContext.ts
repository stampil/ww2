import { createContext, useContext } from 'react'
import { useTranslation } from 'react-i18next'
import type { Clan } from './useBase'

/** The side of the base the player looks at: the ranks and the medals carry the names of its army. */
export const ClanContext = createContext<Clan | null>(null)

/** The name of a rank, in the uniform of the side of the base. */
export function useRankName(): (rank: number) => string {
  const { t } = useTranslation()
  const clan = useContext(ClanContext)!

  return (rank) => t(`squadron.ranks.${clan}.${rank}`)
}

/** The name of a medal, by its place among the three a pilot can earn, on the side of the base. */
export function useMedalName(): (medal: number) => string {
  const { t } = useTranslation()
  const clan = useContext(ClanContext)!

  return (medal) => t(`squadron.medals.${clan}.${medal}`)
}
