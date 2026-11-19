import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Gauge from './Gauge'
import Icon from './Icon'
import Pane from './Pane'
import RecipientSelect from './RecipientSelect'
import type { Base, GiftResource, Recipient, Stock, UpgradeInfo, UpgradeName } from './useBase'
import UpgradeCard from './UpgradeCard'

const PURCHASE_STEP = 100
const STOCKS: Stock[] = ['fuel', 'ammunition', 'materials']
const GIFT_RESOURCES: GiftResource[] = ['supplies', ...STOCKS]
const GIFT_STEP = 100

type Props = {
  resources: Base['resources']
  warehouse: Base['warehouse']
  onBuy: (stock: Stock, quantity: number) => void
  upgrade: UpgradeInfo
  onUpgrade: (upgrade: UpgradeName) => void
  /** The bases a gift can go to, the player's own and their allies'. */
  recipients: Recipient[]
  onGive: (recipientBaseId: number, resource: GiftResource, quantity: number) => void
}

/** The stocks of the warehouse, each with its gauge and a button to buy more of it, and a way to give supplies and stocks to another base. */
function WarehousePanel({ resources, warehouse, onBuy, upgrade, onUpgrade, recipients, onGive }: Props) {
  const { t } = useTranslation()
  const [resource, setResource] = useState<GiftResource>('supplies')
  const [quantity, setQuantity] = useState(GIFT_STEP)
  const [chosenId, setChosenId] = useState<number | null>(null)
  const chosen = recipients.find((recipient) => recipient.id === chosenId) ?? recipients[0]

  return (
    <>
      <Pane title={t('base.stocks')}>
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
      {recipients.length > 0 && (
        <Pane title={t('gift.title')}>
          <div className="gift-form">
            <label>
              <span>{t('gift.resource')}</span>
              <select value={resource} onChange={(event) => setResource(event.target.value as GiftResource)}>
                {GIFT_RESOURCES.map((giftResource) => (
                  <option key={giftResource} value={giftResource}>
                    {t(`base.resources.${giftResource}`)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t('gift.quantity')}</span>
              <input type="number" min={1} step={GIFT_STEP} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} />
            </label>
            <label>
              <span>{t('gift.to')}</span>
              <RecipientSelect recipients={recipients} value={chosen.id} onChange={setChosenId} />
            </label>
            <button type="button" onClick={() => onGive(chosen.id, resource, quantity)}>
              {t('gift.give')}
            </button>
          </div>
        </Pane>
      )}
    </>
  )
}

export default WarehousePanel
