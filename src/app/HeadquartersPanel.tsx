import { useTranslation } from 'react-i18next'
import Pane from './Pane'
import { INSTANCE_SITES_URL, useSites } from './useSites'
import WorldMap from './WorldMap'

/** The map of France with the camps of the player's world: their own is ringed in gold, those of their allies in green, those of the enemy are greyed; a list says who holds what. Only shown for now. */
function HeadquartersPanel({ site }: { site: string }) {
  const { t } = useTranslation()
  const sites = useSites(INSTANCE_SITES_URL)

  if (sites === null) {
    return null
  }

  const ownClan = sites.find((camp) => camp.site === site)!.clan

  return (
    <Pane title={t('world.map')}>
      <p className="world-legend">{t('world.side', { side: t(`world.clan.${ownClan}`) })}</p>
      <p className="world-legend">{t('world.legend')}</p>
      <WorldMap sites={sites} selected={site} ownClan={ownClan} />
      <ul className="world-holders">
        {sites.map((camp) => {
          let relation = t('world.free')
          if (camp.site === site) {
            relation = t('world.relation.own')
          } else if (camp.holder !== null) {
            relation = t(camp.clan === ownClan ? 'world.relation.ally' : 'world.relation.enemy', { holder: camp.holder })
          }
          return (
            <li key={camp.site}>
              <strong>{t(`world.site.${camp.site}`)}</strong> : {relation}
            </li>
          )
        })}
      </ul>
    </Pane>
  )
}

export default HeadquartersPanel
