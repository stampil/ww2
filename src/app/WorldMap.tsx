import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { assetUrl } from '../assetUrl'
import { FRANCE_MAP, sitePlace } from '../plans/franceMap'
import type { SiteChoice } from './useSites'

const MAP_URL = assetUrl('maps/carte-france.jpg')
const FREE_CAMP_URL = assetUrl('sprites/camps/camp-free.png')
const HELD_CAMP_URL = assetUrl('sprites/camps/camp-held.png')
const PERCENT = 100

type Props = {
  sites: SiteChoice[]
  /** The site the player has picked, if any. */
  selected: string | null
  /** What a click on a camp does; without it the map is only shown. */
  onSelect?: (site: string) => void
  /** Whether a camp that is taken can be picked too, and not only a free one. */
  canSelectTaken?: boolean
  /** The sites of the bases of the player, ringed in gold. */
  ownSites?: string[]
  /** The side of the player: the camps that other players of that side hold are marked as allies. */
  ownClan?: string
}

/** The map of France with a camp on each site: a free one can be picked, and a taken one too where asked; a taken one has its own picture, with a green glow when an ally holds it. On a phone the map is wider than the screen and slides sideways, from the camps. */
function WorldMap({ sites, selected, onSelect, canSelectTaken = false, ownSites = [], ownClan }: Props) {
  const { t } = useTranslation()
  const viewportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const viewport = viewportRef.current!
    const middle = sites.reduce((sum, { site }) => sum + sitePlace(site).left, 0) / sites.length
    viewport.scrollLeft = (middle / PERCENT) * viewport.scrollWidth - viewport.clientWidth / 2
    // The map is centred on the camps once, when it appears, not every time the list of sites is read again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="world-map-viewport" ref={viewportRef}>
      <div className="world-map" role="group" aria-label={t('world.map')} style={{ aspectRatio: `${FRANCE_MAP.width} / ${FRANCE_MAP.height}` }}>
        <img className="world-map-picture" src={MAP_URL} alt="" />
        {sites.map(({ site, free, clan }) => {
          const { left, top, labelSide } = sitePlace(site)
          return (
            <button
              key={site}
              type="button"
              className="world-camp"
              data-free={free}
              data-clan={clan}
              data-own={ownSites.includes(site)}
              data-ally={!free && !ownSites.includes(site) && clan === ownClan}
              data-label-side={labelSide}
              aria-label={`${t(`world.site.${site}`)} : ${t(free ? 'world.free' : 'world.taken')}`}
              title={t(`world.airfield.${site}`)}
              aria-pressed={selected === site}
              disabled={(!free && !canSelectTaken) || onSelect === undefined}
              style={{ left: `${left}%`, top: `${top}%` }}
              onClick={onSelect === undefined ? undefined : () => onSelect(site)}
            >
              <img src={free ? FREE_CAMP_URL : HELD_CAMP_URL} alt="" />
              <span aria-hidden="true">{t(`world.site.${site}`)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default WorldMap
