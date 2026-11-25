import type { BaseEvent } from './useBase'

/** One sheet of the journal: an event, and for a mission the aircraft whose pilot's page it is. */
export type JournalSheet = { event: BaseEvent; crewIndex: number }

/** The sheets of the journal, the oldest first: one for each event, and for a mission one for each of its aircraft, in the order of the report. */
export function sheetsOf(events: BaseEvent[]): JournalSheet[] {
  const sheets: JournalSheet[] = []
  for (const event of events) {
    const sheetCount = event.kind === 'mission' ? event.crews.length : 1
    for (let crewIndex = 0; crewIndex < sheetCount; crewIndex += 1) {
      sheets.push({ event, crewIndex })
    }
  }

  return sheets
}

/** The sheet the journal opens on: the first of the latest event, so that a mission of several aircraft is read from its first page. */
export function openingSheetOf(sheets: JournalSheet[]): number {
  const latest = sheets[sheets.length - 1].event

  return sheets.findIndex((sheet) => sheet.event === latest)
}
