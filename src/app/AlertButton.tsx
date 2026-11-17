// The "warning" icon of Material Icons, Apache License 2.0.
const WARNING_ICON_PATH = 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z'

/** Lights up when something at the base needs the player; a click opens the building where it is dealt with. */
function AlertButton({ label, onOpen }: { label: string; onOpen: () => void }) {
  return (
    <button type="button" className="alert-button" onClick={onOpen}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d={WARNING_ICON_PATH} />
      </svg>
      {label}
    </button>
  )
}

export default AlertButton
