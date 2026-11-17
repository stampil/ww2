import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Player } from './useAccount'
import { useBase } from './useBase'
import type { Part, Stock } from './useBase'

const PURCHASE_STEP = 100
const SECONDS_PER_MINUTE = 60
const STOCKS: Stock[] = ['fuel', 'ammunition', 'materials']

function clock(seconds: number): string {
  return `${Math.floor(seconds / SECONDS_PER_MINUTE)}:${String(seconds % SECONDS_PER_MINUTE).padStart(2, '0')}`
}

/** The base of the player who is signed in: resources, warehouse, workshop and buildings. */
function BasePanel({ player }: { player: Player | null }) {
  const { t } = useTranslation()
  const { base, jobs, buy, produce } = useBase(player)
  const [errorCode, setErrorCode] = useState<string | null>(null)

  if (player === null || base === null) {
    return null
  }

  async function order(sending: Promise<string | null>): Promise<void> {
    setErrorCode(await sending)
  }

  const { resources, warehouse, workshop } = base

  return (
    <section className="base" aria-label={t('base.title')}>
      <h2>{t('base.title')}</h2>
      <ul className="resources">
        {(['supplies', 'fuel', 'ammunition', 'materials', 'commandPoints'] as const).map((resource) => (
          <li key={resource}>
            <span>{t(`base.resources.${resource}`)}</span>
            <strong>{resources[resource]}</strong>
          </li>
        ))}
      </ul>
      {errorCode !== null && (
        <p className="account-error" role="alert">
          {t(`base.errors.${errorCode}`)}
        </p>
      )}

      <h3>{t('base.warehouse')}</h3>
      <ul className="cards">
        {STOCKS.map((stock) => (
          <li key={stock} className="card">
            <strong>{t(`base.resources.${stock}`)}</strong>
            <meter min={0} max={warehouse.capacity} value={resources[stock]} />
            <span>{t('base.stored', { stored: resources[stock], capacity: warehouse.capacity })}</span>
            <button type="button" onClick={() => void order(buy(stock, PURCHASE_STEP))}>
              {t('base.buy', { quantity: PURCHASE_STEP, cost: PURCHASE_STEP * warehouse.prices[stock] })}
            </button>
          </li>
        ))}
      </ul>

      <h3>{t('base.workshop')}</h3>
      <p className="squadron-hint">{t('base.mechanics', { count: workshop.freeMechanics })}</p>
      <ul className="cards">
        {workshop.parts.map((part) => (
          <li key={part.part} className="card">
            <strong>{t(`base.parts.${part.part}`)}</strong>
            <span>{t('base.partCost', { cost: part.materialCost, time: clock(part.seconds) })}</span>
            <span>{t('base.ready', { count: workshop.readyParts[part.part] })}</span>
            <div className="card-actions">
              <button type="button" onClick={() => void order(produce(part.part as Part, false))}>
                {t('base.make')}
              </button>
              <button type="button" onClick={() => void order(produce(part.part as Part, true))}>
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

      <h3>{t('base.buildings')}</h3>
      <ul className="cards">
        {base.buildings.map((building) => (
          <li key={building} className="card">
            <strong>{t(`base.building.${building}.name`)}</strong>
            <span>{t(`base.building.${building}.text`)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default BasePanel
