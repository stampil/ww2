import { useEffect, useId, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { refusalKey } from './shortages'

// How long the refusal of an order stays under its button.
const REFUSAL_VISIBLE_MILLISECONDS = 6000

type Props = {
  /** Gives the order; returns the code of the error the API gave, or null when it worked. */
  onOrder: () => Promise<string | null>
  /** The key of the text that says why the order cannot be given now, when something already stops it. */
  reasonKey?: string | null
  disabled?: boolean
  className?: string
  children: ReactNode
}

/** A button that gives an order: a ring turns on it and it cannot be clicked until the API has answered, and what stops the order, before or after the click, is written under it. */
function OrderButton({ onOrder, reasonKey = null, disabled = false, className, children }: Props) {
  const { t } = useTranslation()
  const reasonId = useId()
  const [isPending, setIsPending] = useState(false)
  const [refusalCode, setRefusalCode] = useState<string | null>(null)
  const reason = reasonKey ?? (refusalCode === null ? null : refusalKey(refusalCode))

  useEffect(() => {
    if (refusalCode === null) {
      return
    }
    const timer = setTimeout(() => setRefusalCode(null), REFUSAL_VISIBLE_MILLISECONDS)
    return () => clearTimeout(timer)
  }, [refusalCode])

  async function giveOrder(): Promise<void> {
    setRefusalCode(null)
    setIsPending(true)
    const code = await onOrder()
    setIsPending(false)
    setRefusalCode(code)
  }

  return (
    <>
      <button type="button" className={className} disabled={disabled || isPending || reasonKey !== null} aria-busy={isPending} aria-describedby={reason === null ? undefined : reasonId} onClick={() => void giveOrder()}>
        <span className="order-label">{children}</span>
        {isPending && <span className="order-spinner" aria-hidden="true" />}
      </button>
      {reason !== null && (
        <span id={reasonId} className="order-reason" role={reasonKey === null ? 'alert' : undefined}>
          {t(reason)}
        </span>
      )}
    </>
  )
}

export default OrderButton
