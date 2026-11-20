import sitePlaces from '../../api/data/site-places.json'

/** The picture of the map of France, in pixels. */
export const FRANCE_MAP = { width: 1264, height: 798 }

const PERCENT = 100

type LabelSide = 'left' | 'right'

/** Where each site stands on the picture, in pixels from its top-left corner, and on which side of its camp its name is written; the file is the API's too, which measures the flights by it. The map is drawn, not surveyed: the places were set by eye, from the longitude and latitude of each airfield and then moved a little so that no two camps touch, and kept on land. */
const SITE_PIXELS = sitePlaces as Record<string, { x: number; y: number; labelSide: LabelSide }>

/** The place of a site on the map, in percent of the picture, and the side of its name. */
export function sitePlace(site: string): { left: number; top: number; labelSide: LabelSide } {
  const { x, y, labelSide } = SITE_PIXELS[site]
  return { left: (x / FRANCE_MAP.width) * PERCENT, top: (y / FRANCE_MAP.height) * PERCENT, labelSide }
}
