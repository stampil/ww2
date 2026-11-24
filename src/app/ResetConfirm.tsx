import { useTranslation } from 'react-i18next'
import GameWindow from './GameWindow'
import OrderButton from './OrderButton'

type Props = {
  onConfirm: () => Promise<string | null>
  onCancel: () => void
}

/** Asks before the base is wiped to start from scratch, since nothing can bring it back. */
function ResetConfirm({ onConfirm, onCancel }: Props) {
  const { t } = useTranslation()

  return (
    <GameWindow title={t('reset.title')} onDismiss={onCancel}>
      <div className="reset-confirm">
        <p>{t('reset.text')}</p>
        <div className="guide-actions">
          <button type="button" className="go" onClick={onCancel}>
            {t('reset.cancel')}
          </button>
          <OrderButton onOrder={onConfirm}>{t('reset.confirm')}</OrderButton>
        </div>
      </div>
    </GameWindow>
  )
}

export default ResetConfirm
