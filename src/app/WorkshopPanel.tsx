import { useTranslation } from 'react-i18next'
import { formatDuration } from './formatDuration'
import Icon from './Icon'
import GoodsPicture from './GoodsPicture'
import OrderButton from './OrderButton'
import Pane from './Pane'
import { assembleShortage, productionShortage } from './shortages'
import type { Base, Part, UpgradeInfo, UpgradeName } from './useBase'
import UpgradeCard from './UpgradeCard'

type Props = {
  workshop: Base['workshop']
  jobs: Base['workshop']['jobs']
  /** The materials the camp has, which the parts are made of. */
  materials: number
  onProduce: (part: Part, withMechanic: boolean) => Promise<string | null>
  onAssemble: () => Promise<string | null>
  upgrade: UpgradeInfo
  commandPoints: number
  onUpgrade: (upgrade: UpgradeName) => Promise<string | null>
}

/** The spare parts the workshop can make, with or without a mechanic, the aircraft that the four parts make up, and the ones being made. */
function WorkshopPanel({ workshop, jobs, materials, onProduce, onAssemble, upgrade, commandPoints, onUpgrade }: Props) {
  const { t } = useTranslation()

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
                <GoodsPicture name={part.part} />
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
                <OrderButton onOrder={() => onProduce(part.part, false)} reasonKey={productionShortage(workshop, part.materialCost, false, materials)}>
                  {t('base.make')}
                </OrderButton>
                <OrderButton onOrder={() => onProduce(part.part, true)} reasonKey={productionShortage(workshop, part.materialCost, true, materials)}>
                  <Icon name="mechanic" />
                  {t('base.makeWithMechanic')}
                </OrderButton>
              </div>
            </li>
          ))}
          <UpgradeCard info={upgrade} commandPoints={commandPoints} onBuy={onUpgrade} />
        </ul>
      </Pane>
      <Pane title={t('base.assemble.title')}>
        <p className="note">{t('base.assemble.text')}</p>
        <OrderButton onOrder={onAssemble} reasonKey={assembleShortage(workshop)}>
          <Icon name="aircraft" />
          {t('base.assemble.button')}
        </OrderButton>
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
