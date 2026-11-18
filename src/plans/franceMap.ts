/** The picture of the map of France, in pixels. */
export const FRANCE_MAP = { width: 1264, height: 798 }

const PERCENT = 100

type LabelSide = 'left' | 'right'

/** Where each site stands on the picture, in pixels from its top-left corner, and on which side of its camp its name is written. The map is drawn, not surveyed: the places were set by eye. The sites are those of `Site.php` in the API. */
const SITE_PIXELS: Record<string, { x: number; y: number; labelSide: LabelSide }> = {
  lille: { x: 635, y: 138, labelSide: 'right' },
  reims: { x: 689, y: 224, labelSide: 'left' },
  metz: { x: 800, y: 222, labelSide: 'right' },
  nancy: { x: 820, y: 282, labelSide: 'right' },
  dijon: { x: 746, y: 345, labelSide: 'right' },
  orleans: { x: 571, y: 309, labelSide: 'left' },
}

/** The place of a site on the map, in percent of the picture, and the side of its name. */
export function sitePlace(site: string): { left: number; top: number; labelSide: LabelSide } {
  const { x, y, labelSide } = SITE_PIXELS[site]
  return { left: (x / FRANCE_MAP.width) * PERCENT, top: (y / FRANCE_MAP.height) * PERCENT, labelSide }
}
