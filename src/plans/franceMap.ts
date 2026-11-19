/** The picture of the map of France, in pixels. */
export const FRANCE_MAP = { width: 1264, height: 798 }

const PERCENT = 100

type LabelSide = 'left' | 'right'

/** Where each site stands on the picture, in pixels from its top-left corner, and on which side of its camp its name is written. The map is drawn, not surveyed: the places were set by eye, from the longitude and latitude of each airfield and then moved a little so that no two camps touch. The sites are those of `Site.php` in the API. */
const SITE_PIXELS: Record<string, { x: number; y: number; labelSide: LabelSide }> = {
  lille: { x: 635, y: 138, labelSide: 'right' },
  reims: { x: 689, y: 224, labelSide: 'left' },
  metz: { x: 800, y: 222, labelSide: 'right' },
  nancy: { x: 820, y: 282, labelSide: 'right' },
  dijon: { x: 746, y: 345, labelSide: 'left' },
  orleans: { x: 571, y: 309, labelSide: 'left' },
  villacoublay: { x: 590, y: 255, labelSide: 'left' },
  saintdizier: { x: 739, y: 265, labelSide: 'left' },
  luxeuil: { x: 835, y: 335, labelSide: 'right' },
  avord: { x: 618, y: 366, labelSide: 'left' },
  essen: { x: 848, y: 76, labelSide: 'right' },
  koeln: { x: 843, y: 118, labelSide: 'left' },
  bonn: { x: 880, y: 148, labelSide: 'right' },
  mainz: { x: 913, y: 180, labelSide: 'left' },
  frankfurt: { x: 972, y: 190, labelSide: 'right' },
  mannheim: { x: 945, y: 230, labelSide: 'right' },
  badenoos: { x: 925, y: 288, labelSide: 'right' },
  stuttgart: { x: 1000, y: 262, labelSide: 'right' },
  lechfeld: { x: 1140, y: 290, labelSide: 'right' },
  muenchen: { x: 1205, y: 335, labelSide: 'left' },
}

/** The place of a site on the map, in percent of the picture, and the side of its name. */
export function sitePlace(site: string): { left: number; top: number; labelSide: LabelSide } {
  const { x, y, labelSide } = SITE_PIXELS[site]
  return { left: (x / FRANCE_MAP.width) * PERCENT, top: (y / FRANCE_MAP.height) * PERCENT, labelSide }
}
