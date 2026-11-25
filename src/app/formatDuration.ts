const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60
const TIME_UNIT_DIGITS = 2

/** A part of a time on two digits, like 05. */
function twoDigits(value: number): string {
  return String(value).padStart(TIME_UNIT_DIGITS, '0')
}

/** A number of seconds as minutes and seconds, like 1:05, and as hours, minutes and seconds from an hour on, like 16:19:12. */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE)
  const secondsPart = twoDigits(seconds % SECONDS_PER_MINUTE)
  if (minutes < MINUTES_PER_HOUR) {
    return `${minutes}:${secondsPart}`
  }
  return `${Math.floor(minutes / MINUTES_PER_HOUR)}:${twoDigits(minutes % MINUTES_PER_HOUR)}:${secondsPart}`
}
