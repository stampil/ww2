import { useTranslation } from 'react-i18next'
import Pane from './Pane'
import { INSTANCE_SITES_URL, useSites } from './useSites'
import WorldMap from './WorldMap'

/** The map of France with the camps of the player's world: their own is ringed in gold, the others are greyed when another player holds them. Only shown for now. */
function HeadquartersPanel({ site }: { site: string }) {
  const { t } = useTranslation()
  const sites = useSites(INSTANCE_SITES_URL)

  if (sites === null) {
    return null
  }

  return (
    <Pane title={t('world.map')}>
      <p className="world-legend">{t('world.legend')}</p>
      <WorldMap sites={sites} selected={site} />
    </Pane>
  )
}

export default HeadquartersPanel
