import { useTranslation } from 'react-i18next'
import Pane from './Pane'
import type { BaseEvent, ExplosionEvent, MissionReport, Part } from './useBase'

function crewOutcomeKey(crew: MissionReport['crews'][number]): string {
  if (crew.pilotKilled) {
    return 'base.mission.crewKilled'
  }
  if (crew.aircraftLost) {
    return 'base.mission.crewLost'
  }
  return 'base.mission.crewDamaged'
}

function MissionReportItem({ report }: { report: MissionReport }) {
  const { t } = useTranslation()

  function crewLine(crew: MissionReport['crews'][number]): string {
    const details = [t(crewOutcomeKey(crew), { pilot: crew.pilotName, aircraft: crew.aircraftName, damage: crew.damage })]
    if (crew.destroyedModules.length > 0) {
      const names = crew.destroyedModules.map((part: Part) => t(`base.parts.${part}`))
      details.push(t('base.mission.modulesDestroyed', { modules: names.join(', ') }))
    }
    if (crew.burning) {
      details.push(t('base.mission.burning'))
    }
    return details.join(', ')
  }

  return (
    <li>
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
          <li key={crew.pilotName}>{crewLine(crew)}</li>
        ))}
      </ul>
    </li>
  )
}

function ExplosionItem({ event }: { event: ExplosionEvent }) {
  const { t } = useTranslation()
  const key = event.pilotName === null ? 'base.event.explosionAlone' : event.pilotKilled ? 'base.event.explosionKilled' : 'base.event.explosionSafe'

  return (
    <li>
      <strong>{t('base.event.explosion')}</strong>
      <span>{t(key, { aircraft: event.aircraftName, pilot: event.pilotName })}</span>
    </li>
  )
}

/** The latest events of the base, the newest first: mission reports, and aircraft that exploded on the runway. */
function EventList({ events }: { events: BaseEvent[] }) {
  const { t } = useTranslation()

  return (
    <Pane title={t('base.mission.reports')}>
      <ul className="reports">
        {events.map((event) => (event.kind === 'mission' ? <MissionReportItem key={event.id} report={event} /> : <ExplosionItem key={event.id} event={event} />))}
      </ul>
    </Pane>
  )
}

export default EventList
