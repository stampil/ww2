import { useTranslation } from 'react-i18next'

// The "warning" icon of Material Icons, Apache License 2.0.
const WARNING_ICON_PATH = 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z'

/** Lights up when a squadron is back; a click opens the headquarters, where it is received. */
function MissionAlert({ onOpen }: { onOpen: () => void }) {
  const { t } = useTranslation()

  return (
    <button type="button" className="mission-alert" onClick={onOpen}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d={WARNING_ICON_PATH} />
      </svg>
      {t('base.alert')}
    </button>
  )
}

export default MissionAlert
