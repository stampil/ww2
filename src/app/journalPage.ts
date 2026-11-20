import type { TFunction } from 'i18next'
import { SeededRandom } from '../three/SeededRandom'
import type { MissionReport } from './useBase'

// Wind speeds, in km/h, below and from which the pilot writes about the wind.
const CALM_WIND = 10
const STRONG_WIND = 30
const HIGH_RISK = 3
const LONG_FLIGHT_SECONDS = 240
const SECONDS_PER_MINUTE = 60
// The durability lost from which the aircraft is written of as in a bad state, and the gauge value from which the strain of the pilot is written of.
const HEAVY_DAMAGE = 20
const STRAINED_GAUGE = 60
const MORNING_FROM_HOUR = 5
const AFTERNOON_FROM_HOUR = 12
const EVENING_FROM_HOUR = 18
const NIGHT_FROM_HOUR = 22

type Crew = MissionReport['crews'][number]
/** The part of the day a page is written in; `unknown` for the pages kept before the journal dated them. */
type DayPart = 'morning' | 'afternoon' | 'evening' | 'night' | 'unknown'
type DamageState = 'none' | 'light' | 'heavy' | 'burning' | 'lost'

/** A page of the journal: its paragraphs, and the pilot who wrote it, who is none when no pilot came back to write it. */
export type JournalPage = { paragraphs: string[]; signature: string | null }

function dayPartOf(gameTime: Date | null): DayPart {
  if (gameTime === null) {
    return 'unknown'
  }
  const hour = gameTime.getUTCHours()
  if (hour >= NIGHT_FROM_HOUR || hour < MORNING_FROM_HOUR) {
    return 'night'
  }
  if (hour < AFTERNOON_FROM_HOUR) {
    return 'morning'
  }
  if (hour < EVENING_FROM_HOUR) {
    return 'afternoon'
  }
  return 'evening'
}

function damageStateOf(crew: Crew): DamageState {
  if (crew.aircraftLost) {
    return 'lost'
  }
  if (crew.burning) {
    return 'burning'
  }
  if (crew.damage >= HEAVY_DAMAGE) {
    return 'heavy'
  }
  if (crew.damage > 0) {
    return 'light'
  }
  return 'none'
}

/**
 * The diary page of a pilot who flew a mission: sentences written beforehand, in the language of the player, chosen after the mission, its result, the wind, the damage, the comrades lost and how the pilot feels.
 * The same report always gives the same page, because the variants are drawn from the id of the report; what a report does not tell is left out.
 */
export function composeMissionPage(report: MissionReport, gameTime: Date | null, t: TFunction, language: string): JournalPage {
  const random = new SeededRandom(report.id)
  const names = new Intl.ListFormat(language)

  function say(key: string, values: Record<string, string> = {}): string {
    const variants = t(key, { returnObjects: true, ...values }) as unknown as string[]
    return random.pickOne(variants)
  }

  const killed = report.crews.filter((crew) => crew.pilotKilled).map((crew) => crew.pilotName)
  const survivors = report.crews.filter((crew) => !crew.pilotKilled)
  if (survivors.length === 0) {
    return { paragraphs: [say('journal.blank', { lost: names.format(killed) })], signature: null }
  }

  const writer = random.pickOne(survivors)
  const comrades = report.crews.filter((crew) => crew !== writer).map((crew) => crew.pilotName)
  const succeeded = writer.succeeded ?? report.success
  const outcome = succeeded ? 'success' : 'failure'

  const flight = [say(`journal.${report.type}.opening`, { aircraft: writer.aircraftName, dayPart: t(`journal.dayPart.${dayPartOf(gameTime)}`) })]
  if (report.windSpeed < CALM_WIND) {
    flight.push(say('journal.wind.calm'))
  } else if (report.windSpeed >= STRONG_WIND) {
    flight.push(say('journal.wind.strong'))
  }
  if (comrades.length === 0) {
    flight.push(say('journal.crew.alone'))
  } else {
    flight.push(say('journal.crew.together', { comrades: names.format(comrades) }))
  }
  if (report.durationSeconds !== undefined && report.durationSeconds >= LONG_FLIGHT_SECONDS) {
    flight.push(say('journal.duration.long', { minutes: String(Math.round(report.durationSeconds / SECONDS_PER_MINUTE)) }))
  }

  const result = [say(`journal.${report.type}.${outcome}`)]
  if (report.risk === HIGH_RISK) {
    result.push(say('journal.risk.high'))
  }

  const cost = [say(`journal.damage.${damageStateOf(writer)}`, { aircraft: writer.aircraftName })]
  if (killed.length === 1) {
    cost.push(say('journal.loss.one', { lost: killed[0] }))
  } else if (killed.length > 1) {
    cost.push(say('journal.loss.several', { lost: names.format(killed) }))
  }

  const ending: string[] = []
  if (writer.stress !== undefined && writer.fatigue !== undefined) {
    if (writer.stress >= STRAINED_GAUGE) {
      ending.push(say('journal.state.stressed'))
    } else if (writer.fatigue >= STRAINED_GAUGE) {
      ending.push(say('journal.state.tired'))
    } else {
      ending.push(say('journal.state.fine'))
    }
  }
  ending.push(say(`journal.closing.${outcome}`))

  return {
    paragraphs: [flight.join(' '), result.join(' '), cost.join(' '), ending.join(' ')],
    signature: writer.pilotName,
  }
}
