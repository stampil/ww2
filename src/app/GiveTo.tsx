import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import RecipientSelect from './RecipientSelect'
import type { Recipient } from './useBase'

type Props = {
  recipients: Recipient[]
  /** Whether what is to be given cannot go now: it flies, rests or is being repaired. */
  isDisabled: boolean
  onGive: (recipientBaseId: number) => void
}

/** A choice of base and a button to send a pilot or an aircraft there; nothing when there is no base to send it to. */
function GiveTo({ recipients, isDisabled, onGive }: Props) {
  const { t } = useTranslation()
  const [chosenId, setChosenId] = useState<number | null>(null)

  if (recipients.length === 0) {
    return null
  }

  const chosen = recipients.find((recipient) => recipient.id === chosenId) ?? recipients[0]

  return (
    <div className="gift-to">
      <RecipientSelect recipients={recipients} value={chosen.id} onChange={setChosenId} />
      <button type="button" disabled={isDisabled} onClick={() => onGive(chosen.id)}>
        {t('gift.give')}
      </button>
    </div>
  )
}

export default GiveTo
