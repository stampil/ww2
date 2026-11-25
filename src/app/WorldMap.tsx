import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { assetUrl } from '../assetUrl'
import { FRANCE_MAP, sitePlace } from '../plans/franceMap'
import { frontLine } from '../plans/frontLine'
import type { Point } from '../plans/frontLine'
import type { Clan } from './useBase'
import type { SiteChoice } from './useSites'

const MAP_URL = assetUrl('maps/carte-france.jpg')
const FREE_CAMP_URL = assetUrl('sprites/camps/camp-free.png')
const HELD_CAMP_URL = assetUrl('sprites/camps/camp-held.png')
const ATTACKED_CAMP_URL = assetUrl('sprites/camps/camp-attacked.png')
const BADGE_URLS: Record<Clan, string> = {
  french: assetUrl('sprites/camps/badge-french.png'),
  axe: assetUrl('sprites/camps/badge-axe.png'),
}
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

function campPicture(isFree: boolean, isAttacked: boolean): string {
  if (isAttacked) {
    return ATTACKED_CAMP_URL
  }

  return isFree ? FREE_CAMP_URL : HELD_CAMP_URL
}

/** The place of a site on the picture of the map, in pixels. */
function pixelsOf(site: string): Point {
  const { left, top } = sitePlace(site)

  return { x: (left / PERCENT) * FRANCE_MAP.width, y: (top / PERCENT) * FRANCE_MAP.height }
}

/** The map of France with a camp on each site: a free one can be picked, and a taken one too where asked; a taken one, held by a player or by the AI, has its own picture and the badge of its side in a corner, with a green glow when an ally holds it and a red one when an enemy does, and a camp that a raid hurt a few minutes ago shows in ruins. A dashed line runs between the camps of the two sides, where a point of the map is as near the one as the other; it moves when a camp changes hands. On a phone the map is wider than the screen and slides sideways, from the camps. */
function WorldMap({ sites, selected, onSelect, canSelectTaken = false, ownSites = [], ownClan }: Props) {
  const { t } = useTranslation()
  const viewportRef = useRef<HTMLDivElement>(null)
  const front = useMemo(() => {
    const held = sites.filter(({ free }) => !free)
    const camps = (side: Clan): Point[] => held.filter(({ clan }) => clan === side).map(({ site }) => pixelsOf(site))

    return frontLine(camps('french'), camps('axe'), FRANCE_MAP.width, FRANCE_MAP.height)
  }, [sites])

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
        <svg className="world-front" viewBox={`0 0 ${FRANCE_MAP.width} ${FRANCE_MAP.height}`} aria-hidden="true">
          {front.map((line, index) => (
            <polyline key={index} points={line.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')} />
          ))}
        </svg>
        {sites.map(({ site, free, clan, attacked }) => {
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
              data-enemy={!free && ownClan !== undefined && clan !== ownClan}
              data-side-hint={ownClan === undefined}
              data-label-side={labelSide}
              aria-label={`${t(`world.site.${site}`)} : ${t(free ? 'world.free' : 'world.taken')}`}
              title={t(`world.airfield.${site}`)}
              aria-pressed={selected === site}
              disabled={(!free && !canSelectTaken) || onSelect === undefined}
              style={{ left: `${left}%`, top: `${top}%` }}
              onClick={onSelect === undefined ? undefined : () => onSelect(site)}
            >
              <img className="world-camp-picture" src={campPicture(free, attacked)} alt="" />
              {!free && <img className="world-camp-badge" src={BADGE_URLS[clan]} alt="" />}
              <span aria-hidden="true">{t(`world.site.${site}`)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default WorldMap
