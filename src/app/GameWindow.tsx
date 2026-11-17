import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import Icon from './Icon'

type Props = {
  title: string
  hint?: string
  /** What dismisses the window; without it the window stays until what it announces is dealt with. */
  onDismiss?: () => void
  children: ReactNode
}

/**
 * A window of the game, over the map, as a modal dialog: the browser keeps the keyboard inside it.
 * A close button at the bottom, Escape and a click outside dismiss it; a window without a way to dismiss it opens again if the browser closes it.
 */
function GameWindow({ title, hint, onDismiss, children }: Props) {
  const { t } = useTranslation()
  const titleId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current!
    if (!dialog.open) {
      dialog.showModal()
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="window-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onDismiss?.()
      }}
      onClose={() => {
        if (onDismiss === undefined) {
          dialogRef.current!.showModal()
        }
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onDismiss?.()
        }
      }}
    >
      <div className="game-window">
        <h3 id={titleId} className="window-title">
          {title}
        </h3>
        {hint !== undefined && <p className="window-hint">{hint}</p>}
        <div className="window-body">{children}</div>
        {onDismiss !== undefined && (
          <div className="window-footer">
            <button type="button" aria-label={t('base.window.close')} onClick={onDismiss}>
              <Icon name="close" />
            </button>
          </div>
        )}
      </div>
    </dialog>
  )
}

export default GameWindow
