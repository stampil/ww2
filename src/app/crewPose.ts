const PERCENT = 100

// A sheet of a crew member has four rows of four frames: the walk toward the viewer, to the right, away from the viewer, and the work on one knee.
export const FRAME_ROWS = 4
export const ROW_SHARE = PERCENT / (FRAME_ROWS - 1)
export const WORK_ROW = 3
const WALK_ROWS = { down: 0, right: 1, up: 2 }

/** Which row of the sheet to show, and whether it is the right-hand walk turned round. */
export type CrewPose = { row: number; isFlipped: boolean }

/** The pose for walking from one point to the next. */
export function walkingPose(from: { x: number; y: number }, to: { x: number; y: number }): CrewPose {
  const deltaX = to.x - from.x
  const deltaY = to.y - from.y
  if (Math.abs(deltaY) >= Math.abs(deltaX)) {
    return { row: deltaY >= 0 ? WALK_ROWS.down : WALK_ROWS.up, isFlipped: false }
  }
  return { row: WALK_ROWS.right, isFlipped: deltaX < 0 }
}
