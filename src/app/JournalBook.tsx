import type { TFunction } from 'i18next'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GAME_TIME_ZONE, parseGameTime } from './gameDate'
import GameWindow from './GameWindow'
import { composeMissionPage } from './journalPage'
import { JournalNote } from './JournalNotes'
import type { BaseEvent, MissionReport } from './useBase'
import { useJournal } from './useJournal'

/** What an attack did to its camp, in a sentence: the damage of a raid, the camp taken, or why it came to nothing. */
function attackSentence(report: MissionReport, t: TFunction): string {
  const result = report.attack!

  return t(`base.mission.attack.${result.result}`, { site: t(`world.site.${report.targetSite}`), defenseLost: result.defenseLost })
}

function MissionPage({ report, gameTime }: { report: MissionReport; gameTime: Date | null }) {
  const { t, i18n } = useTranslation()
  const page = composeMissionPage(report, gameTime, t, i18n.language)

  return (
    <>
      {page.paragraphs.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
      {page.signature !== null && <p className="journal-signature">{page.signature}</p>}
      <p className="journal-facts">
        {t(`base.mission.types.${report.type}`)} — {t(report.success ? 'base.mission.succeeded' : 'base.mission.failed')}
        {' · '}
        {report.success ? t('base.mission.gains', { supplies: report.suppliesWon, points: report.commandPointsWon }) : t('base.mission.noGain')}
        {' · '}
        {t('base.mission.windAtTakeoff', { windSpeed: report.windSpeed })}
        {report.spottedMission === true && ` · ${t('base.mission.spotted')}`}
        {report.attack != null && report.targetSite != null && ` · ${attackSentence(report, t)}`}
      </p>
    </>
  )
}

type Props = {
  /** The site of the base the journal belongs to, written at the head of every page. */
  site: string
  onDismiss: () => void
}

/** The journal of the base as an open book: one page of the diary for each thing that happened, the latest first shown, turned with two buttons. */
function JournalBook({ site, onDismiss }: Props) {
  const { t, i18n } = useTranslation()
  const pages = useJournal()
  const [selected, setSelected] = useState<number | null>(null)

  let content = <p className="journal-empty">{t('journal.loading')}</p>
  if (pages !== null && pages.length === 0) {
    content = <p className="journal-empty">{t('journal.empty')}</p>
  }
  if (pages !== null && pages.length > 0) {
    const current = selected ?? pages.length - 1
    const event: BaseEvent = pages[current]
    const gameTime = event.gameTime === undefined ? null : parseGameTime(event.gameTime)
    const formatter = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'long', timeStyle: 'short', timeZone: GAME_TIME_ZONE })

    content = (
      <>
        <article className="journal-pages">
          <header className="journal-head">
            {gameTime !== null && <time dateTime={event.gameTime}>{formatter.format(gameTime)}</time>}
            <span>{t(`world.site.${site}`)}</span>
          </header>
          {event.kind === 'mission' ? (
            <MissionPage report={event} gameTime={gameTime} />
          ) : (
            <ul className="journal-note">
              <JournalNote event={event} />
            </ul>
          )}
        </article>
        <nav className="journal-nav" aria-label={t('journal.pages')}>
          <button type="button" disabled={current === 0} onClick={() => setSelected(current - 1)}>
            {t('journal.previous')}
          </button>
          <span>{t('journal.pageOf', { current: current + 1, total: pages.length })}</span>
          <button type="button" disabled={current === pages.length - 1} onClick={() => setSelected(current + 1)}>
            {t('journal.next')}
          </button>
        </nav>
      </>
    )
  }

  return (
    <GameWindow title={t('journal.title')} hint={t('journal.hint')} onDismiss={onDismiss}>
      <div className="journal-book">{content}</div>
    </GameWindow>
  )
}

export default JournalBook
