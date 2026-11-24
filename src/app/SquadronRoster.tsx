import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRankName } from './ClanContext'
import GameWindow from './GameWindow'
import PilotSheet from './PilotSheet'
import type { FallenPilot, Pilot, PilotRecord } from './useBase'

type Props = {
  pilots: Pilot[]
  /** The pilots of the base who died. */
  fallen: FallenPilot[]
  onDismiss: () => void
}

type View = 'squadron' | 'memorial'

/** The highest rank first, then the most victories, then the name. */
function byMerit(first: Pilot, second: Pilot): number {
  return second.rank - first.rank || second.record.victories - first.record.victories || first.name.localeCompare(second.name)
}

/** The roster of the squadron, as in Wings: the pilots from the highest rank down, with their missions, their victories and the share of their air combats they won; the sheet of the one picked beside it, and the memorial of those who died. */
function SquadronRoster({ pilots, fallen, onDismiss }: Props) {
  const { t, i18n } = useTranslation()
  const rankName = useRankName()
  const [view, setView] = useState<View>('squadron')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const ranked = [...pilots].sort(byMerit)
  const selected = ranked.find((pilot) => pilot.id === selectedId) ?? ranked[0]
  const percent = new Intl.NumberFormat(i18n.language, { style: 'percent' })

  function ratioOf(record: PilotRecord): string {
    return record.airCombats === 0 ? '—' : percent.format(record.victories / record.airCombats)
  }

  const head = (
    <thead>
      <tr>
        <th scope="col">{t('squadron.roster.pilot')}</th>
        <th scope="col">{t('squadron.roster.missions')}</th>
        <th scope="col">{t('squadron.roster.victoriesShort')}</th>
        <th scope="col">{t('squadron.roster.ratio')}</th>
      </tr>
    </thead>
  )

  return (
    <GameWindow title={t('squadron.roster.title')} hint={t('squadron.roster.hint')} onDismiss={onDismiss}>
      <div className="roster-tabs">
        <button type="button" aria-pressed={view === 'squadron'} onClick={() => setView('squadron')}>
          {t('squadron.roster.squadron')}
        </button>
        <button type="button" aria-pressed={view === 'memorial'} onClick={() => setView('memorial')}>
          {t('squadron.roster.memorial')}
        </button>
      </div>
      {view === 'squadron' && (
        <div className="roster-layout">
          <table className="roster-table">
            <caption className="visually-hidden">{t('squadron.roster.title')}</caption>
            {head}
            <tbody>
              {ranked.map((pilot) => (
                <tr key={pilot.id} data-selected={pilot.id === selected?.id}>
                  <th scope="row">
                    <button type="button" className="roster-pick" aria-pressed={pilot.id === selected?.id} onClick={() => setSelectedId(pilot.id)}>
                      {rankName(pilot.rank)} {pilot.name}
                      {pilot.record.isAce && <span className="ace-tag">{t('squadron.roster.ace')}</span>}
                    </button>
                  </th>
                  <td>{pilot.record.missionsFlown}</td>
                  <td>{pilot.record.victories}</td>
                  <td>{ratioOf(pilot.record)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {selected !== undefined && <PilotSheet pilot={selected} />}
        </div>
      )}
      {view === 'memorial' &&
        (fallen.length === 0 ? (
          <p className="medal-none">{t('squadron.roster.memorialEmpty')}</p>
        ) : (
          <table className="roster-table">
            <caption className="visually-hidden">{t('squadron.roster.memorial')}</caption>
            {head}
            <tbody>
              {fallen.map((pilot, index) => (
                <tr key={index}>
                  <th scope="row">
                    {rankName(pilot.rank)} {pilot.name}
                    {pilot.record.isAce && <span className="ace-tag">{t('squadron.roster.ace')}</span>}
                  </th>
                  <td>{pilot.record.missionsFlown}</td>
                  <td>{pilot.record.victories}</td>
                  <td>{ratioOf(pilot.record)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
    </GameWindow>
  )
}

export default SquadronRoster
