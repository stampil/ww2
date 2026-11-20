import { useTranslation } from 'react-i18next'
import type { Recipient } from './useBase'

type Props = {
  recipients: Recipient[]
  /** The id of the base chosen. */
  value: number
  onChange: (recipientBaseId: number) => void
}

/** The bases a pilot or an aircraft can be given to, each with its site and, for an ally's, who holds it. */
function RecipientSelect({ recipients, value, onChange }: Props) {
  const { t } = useTranslation()

  return (
    <select aria-label={t('gift.to')} value={value} onChange={(event) => onChange(Number(event.target.value))}>
      {recipients.map((recipient) => (
        <option key={recipient.id} value={recipient.id}>
          {t(`gift.recipient.${recipient.kinship}`, { site: t(`world.site.${recipient.site}`), holder: recipient.holder })}
        </option>
      ))}
    </select>
  )
}

export default RecipientSelect
