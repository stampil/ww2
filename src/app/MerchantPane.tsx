import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Pane from './Pane'
import type { Base, Stock } from './useBase'

const STOCKS: Stock[] = ['fuel', 'ammunition', 'materials']
const FIRST_QUANTITY = 50

type Props = {
  merchants: Base['merchants']
  onBuy: (campBaseId: number, resource: Stock, quantity: number) => void
  onSell: (campBaseId: number, resource: Stock, quantity: number) => void
}

/** The merchant of the free camps: the player picks a camp and a quantity, and buys fuel, ammunition or materials with supplies, or sells them. */
function MerchantPane({ merchants, onBuy, onSell }: Props) {
  const { t } = useTranslation()
  const [campId, setCampId] = useState<number | null>(null)
  const [quantity, setQuantity] = useState(FIRST_QUANTITY)
  const camp = merchants.camps.find((candidate) => candidate.baseId === campId) ?? merchants.camps[0]

  if (camp === undefined) {
    return null
  }

  return (
    <Pane title={t('merchant.title')}>
      <p className="squadron-hint">{t('merchant.text', { max: merchants.maxTrade })}</p>
      <div className="gift-form">
        <label>
          <span>{t('merchant.camp')}</span>
          <select value={camp.baseId} onChange={(event) => setCampId(Number(event.target.value))}>
            {merchants.camps.map((candidate) => (
              <option key={candidate.baseId} value={candidate.baseId}>
                {t(`world.airfield.${candidate.site}`)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t('gift.quantity')}</span>
          <input type="number" min={1} max={merchants.maxTrade} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} />
        </label>
      </div>
      <ul className="cards">
        {STOCKS.map((stock) => (
          <li key={stock} className="card">
            <strong>{t(`base.resources.${stock}`)}</strong>
            <span>{t('merchant.held', { quantity: camp.stocks[stock].quantity })}</span>
            <div className="card-actions">
              <button type="button" onClick={() => onBuy(camp.baseId, stock, quantity)}>
                {t('merchant.buy', { price: Math.ceil(camp.stocks[stock].buyPrice * quantity) })}
              </button>
              <button type="button" onClick={() => onSell(camp.baseId, stock, quantity)}>
                {t('merchant.sell', { price: Math.floor(camp.stocks[stock].sellPrice * quantity) })}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Pane>
  )
}

export default MerchantPane
