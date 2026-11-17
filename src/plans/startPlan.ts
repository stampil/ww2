import type { PlacedSprite } from './terrainPlan'

// The starting airfield: a runway on row 6, three taxiways north to the aprons with the hangar, the workshop and the depot
// behind them, and the headquarters, the tower, the windsock and the gun south of the runway.
export const START_ROWS = [
  '... BU0 ... ... ... ... ... ... ... BU0 ... ... BU0 ...',
  '... ... ... ... ... ... ... ... BU0 ... ... ... ... ...',
  '... ... ... ... ... ... ... ... ... BU0 ... ... ... ...',
  '... ... ... TA2 ... ... ... TA2 ... ... TA2 ... ... ...',
  '... ... ... TT0 TS1 TS1 TS1 TX0 TS1 TS1 TT2 ... ... ...',
  '... BU0 ... TS0 ... BU0 ... TS0 ... ... TS0 ... BU0 ...',
  '... RE2 RS0 RJ2 RS0 RS0 RS0 RJ2 RS0 RS0 RJ2 RS0 RE0 ...',
  '... ... ... BU0 ... ... ... ... ... ... ... ... ... ...',
  '... ... ... ... ... ... ... ... ... ... ... BU0 ... ...',
]

export const START_SPRITES: PlacedSprite[] = [
  { sprite: 'hangar', building: 'hangar', row: 2, column: 3, widthTiles: 2.6 },
  { sprite: 'camouflaged-tents', building: 'workshop', row: 2, column: 6, widthTiles: 2 },
  { sprite: 'depot', building: 'warehouse', row: 2, column: 11, widthTiles: 2 },
  { sprite: 'command-post', building: 'headquarters', row: 8, column: 6, widthTiles: 1.8 },
  { sprite: 'control-tower', row: 7, column: 9, widthTiles: 1.4 },
  { sprite: 'windsock', row: 7, column: 1, widthTiles: 0.9 },
  { sprite: 'anti-aircraft-bunker', row: 7, column: 12, widthTiles: 0.9 },
]
