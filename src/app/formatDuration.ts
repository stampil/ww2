const SECONDS_PER_MINUTE = 60

/** A number of seconds as minutes and seconds, like 1:05. */
export function formatDuration(seconds: number): string {
  return `${Math.floor(seconds / SECONDS_PER_MINUTE)}:${String(seconds % SECONDS_PER_MINUTE).padStart(2, '0')}`
}
