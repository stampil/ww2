import { useTranslation } from 'react-i18next'

type ControlButtonsProps<Control extends string> = {
  controls: readonly Control[]
  activeControls: ReadonlySet<Control>
  onToggle: (control: Control) => void
}

/** One toggle button per animation; a pressed button means its animation is on. */
function ControlButtons<Control extends string>({ controls, activeControls, onToggle }: ControlButtonsProps<Control>) {
  const { t } = useTranslation()

  return (
    <div className="control-buttons" role="group" aria-label={t('controls.label')}>
      {controls.map((control) => (
        <button key={control} type="button" aria-pressed={activeControls.has(control)} onClick={() => onToggle(control)}>
          {t(`controls.${control}`)}
        </button>
      ))}
    </div>
  )
}

export default ControlButtons
