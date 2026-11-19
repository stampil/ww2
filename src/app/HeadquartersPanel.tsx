import { useTranslation } from 'react-i18next'
import Icon from './Icon'
import Pane from './Pane'
import MerchantPane from './MerchantPane'
import type { Base, HeldBase, Stock } from './useBase'
import { INSTANCE_SITES_URL, useSites } from './useSites'
import type { SiteChoice } from './useSites'
import WorldMap from './WorldMap'

const STOCKS = ['supplies', 'fuel', 'ammunition', 'materials'] as const

/** What a camp holds: its own stores when a player holds it, else what the merchant has to sell. */
function stocksOf(camp: SiteChoice, merchants: Base['merchants']): Partial<Record<(typeof STOCKS)[number], number>> | null {
  if (camp.resources !== null) {
    return camp.resources
  }
  const merchant = merchants.camps.find((candidate) => candidate.site === camp.site)
  if (merchant === undefined) {
    return null
  }
  return { fuel: merchant.stocks.fuel.quantity, ammunition: merchant.stocks.ammunition.quantity, materials: merchant.stocks.materials.quantity }
}

type Props = {
  bases: HeldBase[]
  /** How many bases a player can hold. */
  baseLimit: number
  merchants: Base['merchants']
  onBuy: (campBaseId: number, resource: Stock, quantity: number) => void
  onSell: (campBaseId: number, resource: Stock, quantity: number) => void
}

/** The map of France with the camps of the player's world, the French and the Germans: theirs are ringed in gold, their allies' in green, the enemy's are greyed, with what each camp holds; a free camp is taken by landing an aircraft on it, while the player holds fewer bases than the limit. */
function HeadquartersPanel({ bases, baseLimit, merchants, onBuy, onSell }: Props) {
  const { t } = useTranslation()
  const sites = useSites(INSTANCE_SITES_URL)

  if (sites === null) {
    return null
  }

  const ownSites = bases.map((base) => base.site)
  const ownClan = sites.find((camp) => camp.site === ownSites[0])!.clan

  return (
    <>
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
            const held = stocksOf(camp, merchants)
            return (
              <li key={camp.site} data-clan={camp.clan}>
                <strong>{t(`world.airfield.${camp.site}`)}</strong> ({t(`world.clan.${camp.clan}`)}) : {relation}
                {held !== null && (
                  <span className="world-stock">
                    {STOCKS.filter((stock) => held[stock] !== undefined).map((stock) => (
                      <span key={stock} title={t(`base.resources.${stock}`)}>
                        <Icon name={stock} />
                        {held[stock]}
                      </span>
                    ))}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </Pane>
      <MerchantPane merchants={merchants} onBuy={onBuy} onSell={onSell} />
    </>
  )
}

export default HeadquartersPanel
