import { useTranslation } from 'react-i18next'
import type { Base, Stock } from './useBase'

const PURCHASE_STEP = 100
const STOCKS: Stock[] = ['fuel', 'ammunition', 'materials']

type Props = {
  resources: Base['resources']
  warehouse: Base['warehouse']
  onBuy: (stock: Stock, quantity: number) => void
}

/** The stocks of the warehouse, each with a button to buy more of it. */
function WarehousePanel({ resources, warehouse, onBuy }: Props) {
  const { t } = useTranslation()

  return (
    <ul className="cards">
      {STOCKS.map((stock) => (
        <li key={stock} className="card">
          <strong>{t(`base.resources.${stock}`)}</strong>
          <meter min={0} max={warehouse.capacity} value={resources[stock]} />
          <span>{t('base.stored', { stored: resources[stock], capacity: warehouse.capacity })}</span>
          <button type="button" onClick={() => onBuy(stock, PURCHASE_STEP)}>
            {t('base.buy', { quantity: PURCHASE_STEP, cost: PURCHASE_STEP * warehouse.prices[stock] })}
          </button>
        </li>
      ))}
    </ul>
  )
}

export default WarehousePanel
