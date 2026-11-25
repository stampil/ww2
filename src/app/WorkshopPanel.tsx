import { useTranslation } from 'react-i18next'
import { formatDuration } from './formatDuration'
import Icon from './Icon'
import GoodsPicture from './GoodsPicture'
import OrderButton from './OrderButton'
import Pane from './Pane'
import Gauge from './Gauge'
import { GAUGE_MAX } from './gaugeMax'
import { productionShortage, recruitMechanicShortage } from './shortages'
import type { Base, Part, UpgradeInfo, UpgradeName } from './useBase'
import { useScreenMusic } from './useScreenMusic'
import UpgradeCard from './UpgradeCard'

type Props = {
  workshop: Base['workshop']
  jobs: Base['workshop']['jobs']
  /** The materials the camp has, which the parts are made of. */
  materials: number
  /** The supplies the camp has, which a new mechanic is paid from. */
  supplies: number
  onProduce: (part: Part, withMechanic: boolean) => Promise<string | null>
  onRecruitMechanic: () => Promise<string | null>
  upgrade: UpgradeInfo
  commandPoints: number
  onUpgrade: (upgrade: UpgradeName) => Promise<string | null>
}

/** The spare parts the workshop can make, with or without a mechanic, the mechanics, who can be recruited, and the parts being made. */
function WorkshopPanel({ workshop, jobs, materials, supplies, onProduce, onRecruitMechanic, upgrade, commandPoints, onUpgrade }: Props) {
  const { t } = useTranslation()
  useScreenMusic('maintenance')

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
      <Pane title={t('base.staff.title')}>
        <ul className="cards">
          {workshop.mechanics.map((mechanic, index) => (
            <li key={mechanic.id} className="card">
              <div className="card-head">
                <span className="portrait" aria-hidden="true">
                  <Icon name="mechanic" />
                </span>
                <div>
                  <strong>{t('base.staff.mechanic', { number: index + 1 })}</strong>
                </div>
              </div>
              <Gauge label={t('base.staff.skill')} value={mechanic.skill} max={GAUGE_MAX} higherIsBetter />
            </li>
          ))}
          {workshop.mechanics.length < workshop.mechanicRecruitment.max && (
            <li className="card">
              <div className="card-head">
                <span className="portrait" aria-hidden="true">
                  <Icon name="recruit" />
                </span>
                <div>
                  <strong>{t('base.staff.recruit')}</strong>
                  <span>{t('base.staff.cost', { cost: workshop.mechanicRecruitment.cost })}</span>
                </div>
              </div>
              <div className="card-actions">
                <OrderButton onOrder={onRecruitMechanic} reasonKey={recruitMechanicShortage(workshop, supplies)}>
                  <Icon name="recruit" />
                  {t('base.staff.button')}
                </OrderButton>
              </div>
            </li>
          )}
        </ul>
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
