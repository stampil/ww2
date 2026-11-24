const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/** Whether the player has asked their device for less movement on the screen. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}
