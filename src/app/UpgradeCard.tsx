import { useTranslation } from 'react-i18next'
import type { UpgradeInfo, UpgradeName } from './useBase'

type Props = {
  info: UpgradeInfo
  commandPoints: number
  onBuy: (upgrade: UpgradeName) => void
}

/** The upgrade of a building: what the next level brings, what it costs in command points, and the button to buy it. */
function UpgradeCard({ info, commandPoints, onBuy }: Props) {
  const { t } = useTranslation()

  return (
    <li className="card">
      <strong>{t('base.upgrade.title')}</strong>
      <span>{t(`base.upgrade.${info.upgrade}`)}</span>
      <span>{t('base.upgrade.level', { level: info.level, max: info.maxLevel })}</span>
      <div className="card-actions">
        <button type="button" disabled={info.cost === null || commandPoints < info.cost} onClick={() => onBuy(info.upgrade)}>
          {info.cost === null ? t('base.upgrade.maxed') : t('base.upgrade.buy', { cost: info.cost })}
        </button>
      </div>
    </li>
  )
}

export default UpgradeCard
