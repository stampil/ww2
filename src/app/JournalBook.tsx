import type { TFunction } from 'i18next'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { assetUrl } from '../assetUrl'
import { GAME_TIME_ZONE, parseGameTime } from './gameDate'
import GameWindow from './GameWindow'
import { composeMissionPage } from './journalPage'
import { JournalNote } from './JournalNotes'
import { prefersReducedMotion } from './reducedMotion'
import type { BaseEvent, MissionReport } from './useBase'
import { useJournal } from './useJournal'
import { useJingle } from './useJingle'
import { useScreenMusic } from './useScreenMusic'

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
        {report.bonusSupplies != null && report.bonusSupplies > 0 && ` · ${t('base.mission.bonus', { supplies: report.bonusSupplies })}`}
        {report.spottedMission === true && ` · ${t('base.mission.spotted')}`}
        {report.attack != null && report.targetSite != null && ` · ${attackSentence(report, t)}`}
      </p>
    </>
  )
}

// How long a page takes to turn: the page carries it as the duration of its animation.
const TURN_MILLISECONDS = 700
// The notebook is three images of one width: the band of the rings, the body of the page, which stretches to the text, and the edges of the sheets underneath.
const RINGS_IMAGE = `url(${assetUrl('sprites/journal/journal-rings.png')})`
const PAPER_IMAGE = `url(${assetUrl('sprites/journal/journal-paper.png')})`
const EDGE_IMAGE = `url(${assetUrl('sprites/journal/journal-stack.png')})`

type TurnDirection = 'forward' | 'backward'
/** A page that is turning: the one the reader leaves, and which way they go. */
type Turn = { from: number; direction: TurnDirection }

type PageProps = {
  event: BaseEvent
  /** The site of the base the journal belongs to, written at the head of every page. */
  site: string
  /** Set on the sheet that moves over the spiral while the pages turn. */
  turning?: TurnDirection
}

function JournalPage({ event, site, turning }: PageProps) {
  const { t, i18n } = useTranslation()
  const gameTime = event.gameTime === undefined ? null : parseGameTime(event.gameTime)
  const formatter = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'long', timeStyle: 'short', timeZone: GAME_TIME_ZONE })

  return (
    <article className="journal-leaf" data-turning={turning} aria-hidden={turning === undefined ? undefined : true} style={turning === undefined ? undefined : { backgroundImage: PAPER_IMAGE, animationDuration: `${TURN_MILLISECONDS}ms` }}>
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
  )
}

type Props = {
  site: string
  onDismiss: () => void
}

/** The journal of the base as a pad with a spiral at the top: one sheet for each thing that happened, the latest first shown, which turns up and over the spiral when the reader goes from one to the next. */
function JournalBook({ site, onDismiss }: Props) {
  const { t } = useTranslation()
  const pages = useJournal()
  const [selected, setSelected] = useState<number | null>(null)
  const [turn, setTurn] = useState<Turn | null>(null)
  // A page that reports a mission plays the jingle of how it went: the one of a success or the one of a failure.
  const shownEvent = pages === null || pages.length === 0 ? null : pages[selected ?? pages.length - 1]
  useJingle(shownEvent?.kind === 'mission' ? (shownEvent.success ? 'success' : 'failure') : null)
  useScreenMusic('journal')

  useEffect(() => {
    if (turn === null) {
      return
    }
    const timer = window.setTimeout(() => setTurn(null), TURN_MILLISECONDS)

    return () => window.clearTimeout(timer)
  }, [turn])

  function turnTo(target: number, current: number) {
    setSelected(target)
    if (!prefersReducedMotion()) {
      setTurn({ from: current, direction: target > current ? 'forward' : 'backward' })
    }
  }

  let content = <p className="journal-empty">{t('journal.loading')}</p>
  if (pages !== null && pages.length === 0) {
    content = <p className="journal-empty">{t('journal.empty')}</p>
  }
  if (pages !== null && pages.length > 0) {
    const current = selected ?? pages.length - 1
    // Going forward the sheet that is left lifts off the one underneath; going back the sheet that is reached comes down on the one that is left.
    const underneath = turn?.direction === 'backward' ? turn.from : current
    const moving = turn?.direction === 'forward' ? turn.from : current

    content = (
      <>
        <div className="journal-notebook">
          <div className="journal-rings" aria-hidden="true" style={{ backgroundImage: RINGS_IMAGE }} />
          <div className="journal-stack" style={{ backgroundImage: PAPER_IMAGE }}>
            <JournalPage event={pages[underneath]} site={site} />
            {turn !== null && <JournalPage event={pages[moving]} site={site} turning={turn.direction} />}
          </div>
          <div className="journal-edge" aria-hidden="true" style={{ backgroundImage: EDGE_IMAGE }} />
        </div>
        <nav className="journal-nav" aria-label={t('journal.pages')}>
          <button type="button" disabled={current === 0} onClick={() => turnTo(current - 1, current)}>
            {t('journal.previous')}
          </button>
          <span>{t('journal.pageOf', { current: current + 1, total: pages.length })}</span>
          <button type="button" disabled={current === pages.length - 1} onClick={() => turnTo(current + 1, current)}>
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
