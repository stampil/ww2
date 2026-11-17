import { useTranslation } from 'react-i18next'
import type { Base, Part } from './useBase'

const SECONDS_PER_MINUTE = 60

function clock(seconds: number): string {
  return `${Math.floor(seconds / SECONDS_PER_MINUTE)}:${String(seconds % SECONDS_PER_MINUTE).padStart(2, '0')}`
}

type Props = {
  workshop: Base['workshop']
  jobs: Base['workshop']['jobs']
  onProduce: (part: Part, withMechanic: boolean) => void
}

/** The spare parts the workshop can make, with or without a mechanic, and the ones being made. */
function WorkshopPanel({ workshop, jobs, onProduce }: Props) {
  const { t } = useTranslation()

  return (
    <>
      <p className="squadron-hint">{t('base.mechanics', { count: workshop.freeMechanics })}</p>
      <ul className="cards">
        {workshop.parts.map((part) => (
          <li key={part.part} className="card">
            <strong>{t(`base.parts.${part.part}`)}</strong>
            <span>{t('base.partCost', { cost: part.materialCost, time: clock(part.seconds) })}</span>
            <span>{t('base.ready', { count: workshop.readyParts[part.part] })}</span>
            <div className="card-actions">
              <button type="button" onClick={() => onProduce(part.part, false)}>
                {t('base.make')}
              </button>
              <button type="button" onClick={() => onProduce(part.part, true)}>
                {t('base.makeWithMechanic')}
              </button>
            </div>
          </li>
        ))}
      </ul>
      {jobs.length > 0 && (
        <ul className="jobs" aria-label={t('base.running')}>
          {jobs.map((job) => (
            <li key={job.id}>
              {t(`base.parts.${job.part}`)} — {clock(job.remainingSeconds)}
              {job.hasMechanic ? ` (${t('base.withMechanic')})` : ''}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

export default WorkshopPanel
