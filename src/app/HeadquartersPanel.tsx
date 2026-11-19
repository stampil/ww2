import { useTranslation } from 'react-i18next'
import Icon from './Icon'
import Pane from './Pane'
import type { HeldBase } from './useBase'
import { INSTANCE_SITES_URL, useSites } from './useSites'
import WorldMap from './WorldMap'

const STOCKS = ['supplies', 'fuel', 'ammunition', 'materials'] as const

type Props = {
  bases: HeldBase[]
  /** How many bases a player can hold. */
  baseLimit: number
}

/** The map of France with the camps of the player's world, the French and the Germans: theirs are ringed in gold, their allies' in green, the enemy's are greyed, with what each camp holds; a free camp is taken by landing an aircraft on it, while the player holds fewer bases than the limit. */
function HeadquartersPanel({ bases, baseLimit }: Props) {
  const { t } = useTranslation()
  const sites = useSites(INSTANCE_SITES_URL)

  if (sites === null) {
    return null
  }

  const ownSites = bases.map((base) => base.site)
  const ownClan = sites.find((camp) => camp.site === ownSites[0])!.clan

  return (
    <Pane title={t('world.map')}>
      <p className="world-legend">{t('world.side', { side: t(`world.clan.${ownClan}`) })}</p>
      <p className="world-legend">{t('world.legend')}</p>
      <p className="world-legend">{t('world.landToClaim', { max: baseLimit })}</p>
      <WorldMap sites={sites} selected={null} ownSites={ownSites} ownClan={ownClan} />
      <ul className="world-holders">
        {sites.map((camp) => {
          let relation = t('world.free')
          if (ownSites.includes(camp.site)) {
            relation = t('world.relation.own')
          } else if (camp.holder !== null) {
            relation = t(camp.clan === ownClan ? 'world.relation.ally' : 'world.relation.enemy', { holder: camp.holder })
          }
          return (
            <li key={camp.site} data-clan={camp.clan}>
              <strong>{t(`world.airfield.${camp.site}`)}</strong> ({t(`world.clan.${camp.clan}`)}) : {relation}
              {camp.resources !== null && (
                <span className="world-stock">
                  {STOCKS.map((stock) => (
                    <span key={stock} title={t(`base.resources.${stock}`)}>
                      <Icon name={stock} />
                      {camp.resources![stock]}
                    </span>
                  ))}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </Pane>
  )
}

export default HeadquartersPanel
