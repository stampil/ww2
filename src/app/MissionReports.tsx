import { useTranslation } from 'react-i18next'
import type { Report } from './useBase'

function crewOutcomeKey(crew: Report['crews'][number]): string {
  if (crew.pilotKilled) {
    return 'base.mission.crewKilled'
  }
  if (crew.aircraftLost) {
    return 'base.mission.crewLost'
  }
  return 'base.mission.crewDamaged'
}

/** The latest missions: whether each succeeded, what it paid, and what it did to its pilots and aircraft. */
function MissionReports({ reports }: { reports: Report[] }) {
  const { t } = useTranslation()

  return (
    <>
      <h4>{t('base.mission.reports')}</h4>
      <ul className="reports">
        {reports.map((report) => (
          <li key={report.id}>
            <strong>
              {t(`base.mission.types.${report.type}`)} — {t(report.success ? 'base.mission.succeeded' : 'base.mission.failed')}
            </strong>
            <span>
              {report.success ? t('base.mission.gains', { supplies: report.suppliesWon, points: report.commandPointsWon }) : t('base.mission.noGain')}
              {' · '}
              {t('base.mission.windAtTakeoff', { windSpeed: report.windSpeed })}
            </span>
            <ul>
              {report.crews.map((crew) => (
                <li key={crew.pilotName}>{t(crewOutcomeKey(crew), { pilot: crew.pilotName, aircraft: crew.aircraftName, damage: crew.damage })}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </>
  )
}

export default MissionReports
