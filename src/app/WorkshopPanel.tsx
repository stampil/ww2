import { useTranslation } from 'react-i18next'
import { formatDuration } from './formatDuration'
import Icon from './Icon'
import Pane from './Pane'
import type { Base, Part, UpgradeInfo, UpgradeName } from './useBase'
import UpgradeCard from './UpgradeCard'

type Props = {
  workshop: Base['workshop']
  jobs: Base['workshop']['jobs']
  onProduce: (part: Part, withMechanic: boolean) => void
  onAssemble: () => void
  upgrade: UpgradeInfo
  commandPoints: number
  onUpgrade: (upgrade: UpgradeName) => void
}

/** The spare parts the workshop can make, with or without a mechanic, the aircraft that the four parts make up, and the ones being made. */
function WorkshopPanel({ workshop, jobs, onProduce, onAssemble, upgrade, commandPoints, onUpgrade }: Props) {
  const { t } = useTranslation()
  const canAssemble = workshop.parts.every((part) => workshop.readyParts[part.part] > 0)

  return (
    <>
      <Pane title={t('base.workshopParts')}>
        <p className="note">
          <Icon name="mechanic" />
          {t('base.mechanics', { count: workshop.freeMechanics })}
        </p>
        <ul className="cards">
          {workshop.parts.map((part) => (
            <li key={part.part} className="card">
              <div className="card-head">
                <span className="portrait" aria-hidden="true">
                  <Icon name={part.part} />
                </span>
                <div>
                  <strong>{t(`base.parts.${part.part}`)}</strong>
                  <span>{t('base.ready', { count: workshop.readyParts[part.part] })}</span>
                </div>
              </div>
              <ul className="stats">
                <li title={t('base.resources.materials')}>
                  <Icon name="materials" />
                  {part.materialCost}
                </li>
                <li title={t('base.mission.duration')}>
                  <Icon name="clock" />
                  {formatDuration(part.seconds)}
                </li>
              </ul>
              <div className="card-actions">
                <button type="button" onClick={() => onProduce(part.part, false)}>
                  {t('base.make')}
                </button>
                <button type="button" onClick={() => onProduce(part.part, true)}>
                  <Icon name="mechanic" />
                  {t('base.makeWithMechanic')}
                </button>
              </div>
            </li>
          ))}
          <UpgradeCard info={upgrade} commandPoints={commandPoints} onBuy={onUpgrade} />
        </ul>
      </Pane>
      <Pane title={t('base.assemble.title')}>
        <p className="note">{t('base.assemble.text')}</p>
        <button type="button" disabled={!canAssemble} onClick={onAssemble}>
          <Icon name="aircraft" />
          {t('base.assemble.button')}
        </button>
      </Pane>
      {jobs.length > 0 && (
        <Pane title={t('base.running')}>
          <ul className="jobs">
            {jobs.map((job) => (
              <li key={job.id}>
                <Icon name={job.part} />
                <span>{t(`base.parts.${job.part}`)}</span>
                {job.hasMechanic && <Icon name="mechanic" />}
                <strong>{formatDuration(job.remainingSeconds)}</strong>
              </li>
            ))}
          </ul>
        </Pane>
      )}
    </>
  )
}

export default WorkshopPanel
