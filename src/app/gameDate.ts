// The API writes the game time without a time zone; read as UTC it shows as written.
const UTC_DESIGNATOR = 'Z'

/** The game date follows no real time zone, so it is shown as the API wrote it. */
export const GAME_TIME_ZONE = 'UTC'

/** The date of a game time as the API writes it, `1940-05-10T14:32:07`. */
export function parseGameTime(gameTime: string): Date {
  return new Date(Date.parse(`${gameTime}${UTC_DESIGNATOR}`))
}
