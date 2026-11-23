import { useTranslation } from 'react-i18next'
import { assetUrl } from '../assetUrl'
import Icon from './Icon'
import type { UpgradeInfo, UpgradeName } from './useBase'

type Props = {
  info: UpgradeInfo
  commandPoints: number
  onBuy: (upgrade: UpgradeName) => void
}

/** The upgrade of a building, with the picture of the building: what the next level brings, the level reached, what it costs in command points, and the button to buy it. */
function UpgradeCard({ info, commandPoints, onBuy }: Props) {
  const { t } = useTranslation()

  return (
    <li className="card">
      <div className="card-head">
        <span className="portrait" aria-hidden="true">
          <img src={assetUrl(`sprites/upgrades/${info.upgrade}.png`)} alt="" draggable={false} />
        </span>
        <div>
          <strong>{t('base.upgrade.title')}</strong>
          <span>{t(`base.upgrade.${info.upgrade}`)}</span>
        </div>
      </div>
      <span>{t('base.upgrade.level', { level: info.level, max: info.maxLevel })}</span>
      <div className="card-actions">
        <button type="button" disabled={info.cost === null || commandPoints < info.cost} onClick={() => onBuy(info.upgrade)}>
          {info.cost === null ? (
            t('base.upgrade.maxed')
          ) : (
            <>
              {t('base.upgrade.buy')}
              <span className="price">
                <Icon name="commandPoints" />
                {info.cost}
                <span className="visually-hidden">{t('base.resources.commandPoints')}</span>
              </span>
            </>
          )}
        </button>
      </div>
    </li>
  )
}

export default UpgradeCard
