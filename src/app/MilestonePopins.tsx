import { useEffect, useRef, useState } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { assetUrl } from '../assetUrl'
import { useClan, useRankName } from './ClanContext'
import CrashPicture from './CrashPicture'
import GameWindow from './GameWindow'
import { useJingle } from './useJingle'
import type { Jingle } from '../audio/MusicPlayer'
import type { Livery } from '../three/liveries'
import type { BaseEvent, Clan } from './useBase'

type Milestone =
  | { kind: 'ace' | 'promotion' | 'death'; pilotName: string; rank: number | null }
  | { kind: 'crash'; pilotName: string; aircraftName: string; isPilotKilled: boolean }
/** A milestone waiting for its popin, with a number of its own so that the popin of the one that is shown does not start again when others join it. */
type QueuedMilestone = Milestone & { id: number }

/** What a flight made of its crews that deserves a popin, in the order it comes: the aircraft that does not come back, a promotion, the title of ace, a death. */
function milestonesOf(event: BaseEvent): Milestone[] {
  const milestones: Milestone[] = []
  if (event.kind !== 'mission') {
    return milestones
  }
  for (const crew of event.crews) {
    if (crew.aircraftLost) {
      milestones.push({ kind: 'crash', pilotName: crew.pilotName, aircraftName: crew.aircraftName, isPilotKilled: crew.pilotKilled })
    }
    if (crew.promotedTo != null) {
      milestones.push({ kind: 'promotion', pilotName: crew.pilotName, rank: crew.promotedTo })
    }
    if (crew.becameAce === true) {
      milestones.push({ kind: 'ace', pilotName: crew.pilotName, rank: null })
    }
    if (crew.pilotKilled) {
      milestones.push({ kind: 'death', pilotName: crew.pilotName, rank: null })
    }
  }

  return milestones
}

/** The livery the aircraft of a side wear: the French one, or the German one for the Axe. */
function liveryOf(clan: Clan): Livery {
  return clan === 'french' ? 'french' : 'german'
}

/** The picture of a milestone: the ace is drawn in the colors of the side of the base, the others are the same for both. */
function pictureOf(milestone: Exclude<Milestone, { kind: 'crash' }>, clan: Clan): string {
  if (milestone.kind === 'ace') {
    return assetUrl(`sprites/popins/as-${clan === 'french' ? 'french' : 'german'}.jpg`)
  }

  return assetUrl(`sprites/popins/${milestone.kind}.jpg`)
}

/** What the popin says of the milestone: the title and the text. */
function wordsOf(milestone: Milestone, t: TFunction, rankName: (rank: number) => string): { title: string; text: string } {
  if (milestone.kind === 'crash') {
    const values = { name: milestone.pilotName, aircraft: milestone.aircraftName }

    return { title: t('milestone.crash.title', values), text: t(milestone.isPilotKilled ? 'milestone.crash.textKilled' : 'milestone.crash.textBailed', values) }
  }

  return {
    title: t(`milestone.${milestone.kind}.title`, { name: milestone.pilotName }),
    text: t(`milestone.${milestone.kind}.text`, { name: milestone.pilotName, rank: milestone.rank === null ? '' : rankName(milestone.rank) }),
  }
}

/** The jingle each milestone plays: the one of a success for a promotion or a new ace, the one of a failure for an aircraft that is lost or a pilot who dies. */
const JINGLES_OF: Record<Milestone['kind'], Jingle> = { ace: 'success', promotion: 'success', crash: 'failure', death: 'failure' }

function MilestonePopin({ milestone, onClose }: { milestone: Milestone; onClose: () => void }) {
  const { t } = useTranslation()
  const clan = useClan()
  const rankName = useRankName()
  useJingle(JINGLES_OF[milestone.kind])
  const { title, text } = wordsOf(milestone, t, rankName)

  return (
    <GameWindow title={title} onDismiss={onClose}>
      {milestone.kind === 'crash' ? <CrashPicture livery={liveryOf(clan)} /> : <img className="milestone-picture" src={pictureOf(milestone, clan)} alt="" draggable={false} />}
      <p className="milestone-text">{text}</p>
    </GameWindow>
  )
}

/**
 * The illustrated popins of what a flight made of its pilots, one after the other: a promotion, a pilot who becomes an ace, a pilot who dies, each with its music.
 * They come for the flights received while the base is on the screen: what was in the journal when the base was opened does not come back.
 */
function MilestonePopins({ events }: { events: BaseEvent[] }) {
  const lastSeenId = useRef<number | null>(null)
  const nextMilestoneId = useRef(0)
  const [queue, setQueue] = useState<QueuedMilestone[]>([])

  useEffect(() => {
    const newestId = events.length === 0 ? 0 : events[0].id
    if (lastSeenId.current === null) {
      lastSeenId.current = newestId
      return
    }
    const lastSeen = lastSeenId.current
    const fresh = events.filter((event) => event.id > lastSeen).reverse()
    lastSeenId.current = Math.max(lastSeen, newestId)
    const added = fresh.flatMap(milestonesOf).map((milestone) => ({ ...milestone, id: nextMilestoneId.current++ }))
    if (added.length > 0) {
      setQueue((current) => [...current, ...added])
    }
  }, [events])

  if (queue.length === 0) {
    return null
  }

  return <MilestonePopin key={queue[0].id} milestone={queue[0]} onClose={() => setQueue((current) => current.slice(1))} />
}

export default MilestonePopins
