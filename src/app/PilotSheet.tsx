import { useTranslation } from 'react-i18next'
import { useMedalName, useRankName } from './ClanContext'
import Gauge from './Gauge'
import { GAUGE_MAX } from './gaugeMax'
import Icon from './Icon'
import PilotPortrait from './PilotPortrait'
import type { Pilot } from './useBase'

// A tally of more victories than this is cut off: the marks would fill the sheet.
const MAX_VICTORY_MARKS = 20
const MEDAL_PLACES = [1, 2, 3]

/** The sheet of a pilot: their rank, what they have done, a mark for each victory, their medals and their gauges. */
function PilotSheet({ pilot }: { pilot: Pilot }) {
  const { t } = useTranslation()
  const rankName = useRankName()
  const medalName = useMedalName()
  const { record } = pilot
  const marks: number[] = []
  for (let mark = 0; mark < Math.min(record.victories, MAX_VICTORY_MARKS); mark += 1) {
    marks.push(mark)
  }
  const earnedMedals = MEDAL_PLACES.slice(0, record.medals)

  return (
    <article className="pilot-sheet" aria-label={pilot.name}>
      <header className="pilot-sheet-head">
        <PilotPortrait pilotId={pilot.id} />
        <div>
          <strong>{pilot.name}</strong>
          <span>{rankName(pilot.rank)}</span>
        </div>
        {record.isAce && <span className="ace-tag">{t('squadron.roster.ace')}</span>}
      </header>
      <dl className="pilot-sheet-figures">
        <dt>{t('squadron.roster.missionsFlown')}</dt>
        <dd>{record.missionsFlown}</dd>
        <dt>{t('squadron.roster.missionsSucceeded')}</dt>
        <dd>{record.missionsSucceeded}</dd>
        <dt>{t('squadron.roster.airCombats')}</dt>
        <dd>{record.airCombats}</dd>
        <dt>{t('squadron.roster.victories')}</dt>
        <dd>{record.victories}</dd>
        <dt>{t('squadron.roster.groundSuccesses')}</dt>
        <dd>{record.groundSuccesses}</dd>
        <dt>{t('squadron.roster.aircraftLost')}</dt>
        <dd>{record.aircraftLost}</dd>
      </dl>
      <h5>{t('squadron.roster.marks')}</h5>
      <p className="victory-marks" aria-label={t('squadron.roster.victoriesCount', { count: record.victories })}>
        {marks.length === 0 && <span>{t('squadron.roster.noVictory')}</span>}
        {marks.map((mark) => (
          <Icon key={mark} name="airCombat" />
        ))}
        {record.victories > MAX_VICTORY_MARKS && <span>+{record.victories - MAX_VICTORY_MARKS}</span>}
      </p>
      <h5>{t('squadron.roster.medals')}</h5>
      {earnedMedals.length === 0 ? (
        <p className="medal-none">{t('squadron.roster.noMedal')}</p>
      ) : (
        <ul className="medal-list">
          {earnedMedals.map((medal) => (
            <li key={medal}>
              <Icon name="commandPoints" />
              {medalName(medal)}
            </li>
          ))}
        </ul>
      )}
      <h5>{t('squadron.roster.skills')}</h5>
      <Gauge label={t('squadron.accuracy')} value={pilot.effectiveAccuracy} max={GAUGE_MAX} higherIsBetter />
      <Gauge label={t('squadron.resilience')} value={pilot.effectiveResilience} max={GAUGE_MAX} higherIsBetter />
      <Gauge label={t('squadron.fatigue')} value={pilot.fatigue} max={GAUGE_MAX} higherIsBetter={false} />
      <Gauge label={t('squadron.stress')} value={pilot.stress} max={GAUGE_MAX} higherIsBetter={false} />
    </article>
  )
}

export default PilotSheet
