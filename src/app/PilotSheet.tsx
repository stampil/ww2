import { useTranslation } from 'react-i18next'
import { assetUrl } from '../assetUrl'
import { useClan, useMedal, useRankName } from './ClanContext'
import { GAME_TIME_ZONE } from './gameDate'
import Gauge from './Gauge'
import { GAUGE_MAX } from './gaugeMax'
import Icon from './Icon'
import { pilotFaceUrl } from './pilotFaces'
import type { EnemyType, Pilot } from './useBase'
import { useEnemySilhouettes } from './useEnemySilhouettes'

// A tally of more victories than this is cut off: the marks would fill the sheet.
const MAX_VICTORY_MARKS = 20

/** The mark of one victory: the silhouette of the aircraft that was shot down, or none when its type was not kept. */
type VictoryMark = { key: string; enemy: EnemyType | null }
const MEDAL_PLACES = [1, 2, 3]
// The dossier is three images of one width: the top with the paper clip and the frame of the photo, the body of the paper, which stretches to the text, and the foot.
const DOSSIER_TOP = `url(${assetUrl('sprites/dossier/dossier-top.png')})`
const DOSSIER_BODY = `url(${assetUrl('sprites/dossier/dossier-body.png')})`
const DOSSIER_FOOT = `url(${assetUrl('sprites/dossier/dossier-foot.png')})`

/** The dossier of a pilot: their photo and rank, what they have done, a mark for each victory, their medals and their gauges. */
function PilotSheet({ pilot }: { pilot: Pilot }) {
  const { t, i18n } = useTranslation()
  const dateFormat = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'long', timeZone: GAME_TIME_ZONE })
  const clan = useClan()
  const rankName = useRankName()
  const medalOf = useMedal()
  const { record } = pilot
  const silhouettes = useEnemySilhouettes(record.victoriesOver.map((entry) => entry.enemy))
  const marks: VictoryMark[] = []
  for (const { enemy, victories } of record.victoriesOver) {
    for (let count = 0; count < victories; count += 1) {
      marks.push({ key: `${enemy}-${count}`, enemy })
    }
  }
  const untyped = record.victories - marks.length
  for (let count = 0; count < untyped; count += 1) {
    marks.push({ key: `untyped-${count}`, enemy: null })
  }
  const earnedMedals = MEDAL_PLACES.slice(0, record.medals)

  return (
    <article className="pilot-sheet" aria-label={pilot.name}>
      <header className="pilot-sheet-head" style={{ backgroundImage: DOSSIER_TOP }}>
        <img className="pilot-sheet-photo" src={pilotFaceUrl(pilot.id, clan)} alt="" draggable={false} />
        <div className="pilot-sheet-identity">
          <strong>{pilot.name}</strong>
          <span>{rankName(pilot.rank)}</span>
          {record.isAce && <span className="ace-tag">{t('squadron.roster.ace')}</span>}
        </div>
      </header>
      <div className="pilot-sheet-body" style={{ backgroundImage: DOSSIER_BODY }}>
        <dl className="pilot-sheet-figures">
          <dt>{t('squadron.roster.missionsFlown')}</dt>
          <dd>{record.missionsFlown}</dd>
          <dt>{t('squadron.roster.missionsSucceeded')}</dt>
          <dd>{record.missionsSucceeded}</dd>
          <dt>{t('squadron.roster.airCombats')}</dt>
          <dd>{record.airCombats}</dd>
          <dt>{t('squadron.roster.victories')}</dt>
          <dd>{record.victories}</dd>
          <dt>{t('squadron.roster.fighterVictories')}</dt>
          <dd>{record.fighterVictories}</dd>
          <dt>{t('squadron.roster.bomberVictories')}</dt>
          <dd>{record.bomberVictories}</dd>
          <dt>{t('squadron.roster.groundSuccesses')}</dt>
          <dd>{record.groundSuccesses}</dd>
          <dt>{t('squadron.roster.aircraftLost')}</dt>
          <dd>{record.aircraftLost}</dd>
        </dl>
        <h5>{t('squadron.roster.marks')}</h5>
        <p className="victory-marks" aria-label={t('squadron.roster.victoriesCount', { count: record.victories })}>
          {marks.length === 0 && <span>{t('squadron.roster.noVictory')}</span>}
          {marks.slice(0, MAX_VICTORY_MARKS).map((mark) =>
            mark.enemy !== null && silhouettes[mark.enemy] !== undefined ? (
              <img key={mark.key} className="enemy-silhouette" src={silhouettes[mark.enemy]} alt="" draggable={false} />
            ) : (
              <Icon key={mark.key} name="airCombat" />
            ),
          )}
          {marks.length > MAX_VICTORY_MARKS && <span>+{marks.length - MAX_VICTORY_MARKS}</span>}
        </p>
        <h5>{t('squadron.roster.medals')}</h5>
        {earnedMedals.length === 0 ? (
          <p className="medal-none">{t('squadron.roster.noMedal')}</p>
        ) : (
          <ul className="medal-list">
            {earnedMedals.map((place) => {
              const medal = medalOf(place)

              return (
                <li key={place}>
                  <span className="medal-picture">
                    <img src={medal.image} alt="" draggable={false} />
                  </span>
                  <span>{medal.name}</span>
                </li>
              )
            })}
          </ul>
        )}
        <h5>{t('squadron.roster.assignments')}</h5>
        <ul className="assignment-list">
          {pilot.assignments.map((assignment, index) => (
            <li key={index}>{t('squadron.roster.assignedSince', { site: t(`world.site.${assignment.site}`), date: dateFormat.format(new Date(assignment.since)) })}</li>
          ))}
        </ul>
        <h5>{t('squadron.roster.skills')}</h5>
        <Gauge label={t('squadron.accuracy')} value={pilot.effectiveAccuracy} max={GAUGE_MAX} higherIsBetter />
        <Gauge label={t('squadron.resilience')} value={pilot.effectiveResilience} max={GAUGE_MAX} higherIsBetter />
        <Gauge label={t('squadron.fatigue')} value={pilot.fatigue} max={GAUGE_MAX} higherIsBetter={false} />
        <Gauge label={t('squadron.stress')} value={pilot.stress} max={GAUGE_MAX} higherIsBetter={false} />
      </div>
      <div className="pilot-sheet-foot" aria-hidden="true" style={{ backgroundImage: DOSSIER_FOOT }} />
    </article>
  )
}

export default PilotSheet
