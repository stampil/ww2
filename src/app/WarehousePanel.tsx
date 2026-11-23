import { useTranslation } from 'react-i18next'
import Gauge from './Gauge'
import Icon from './Icon'
import Pane from './Pane'
import type { Base, Stock, UpgradeInfo, UpgradeName } from './useBase'
import UpgradeCard from './UpgradeCard'

const PURCHASE_STEP = 100
const STOCKS: Stock[] = ['fuel', 'ammunition', 'materials']

type Props = {
  resources: Base['resources']
  warehouse: Base['warehouse']
  /** The supplies the camp earns each minute by itself. */
  income: number
  onBuy: (stock: Stock, quantity: number) => void
  upgrade: UpgradeInfo
  onUpgrade: (upgrade: UpgradeName) => void
}

/** The stocks of the warehouse, each with its gauge and a button to buy more of it, and the supplies the front sends by itself. */
function WarehousePanel({ resources, warehouse, income, onBuy, upgrade, onUpgrade }: Props) {
  const { t } = useTranslation()

  return (
    <Pane title={t('base.stocks')}>
      <p className="note">{t('base.income', { count: income })}</p>
      <ul className="cards">
        {STOCKS.map((stock) => (
          <li key={stock} className="card">
            <div className="card-head">
              <span className="portrait" aria-hidden="true">
                <Icon name={stock} />
              </span>
              <div>
                <strong>{t(`base.resources.${stock}`)}</strong>
                <span>{t('base.stored', { stored: resources[stock], capacity: warehouse.capacity })}</span>
              </div>
            </div>
            <Gauge label={t(`base.resources.${stock}`)} value={resources[stock]} max={warehouse.capacity} higherIsBetter />
            <div className="card-actions">
              <button type="button" onClick={() => onBuy(stock, PURCHASE_STEP)}>
                {t('base.buy', { quantity: PURCHASE_STEP })}
                <span className="price">
                  <Icon name="supplies" />
                  {PURCHASE_STEP * warehouse.prices[stock]}
                  <span className="visually-hidden">{t('base.resources.supplies')}</span>
                </span>
              </button>
            </div>
          </li>
        ))}
        <UpgradeCard info={upgrade} commandPoints={resources.commandPoints} onBuy={onUpgrade} />
      </ul>
    </Pane>
  )
}

export default WarehousePanel
