import { useTranslation } from 'react-i18next'
import type { Livery } from '../three/liveries'

const LIVERIES: Livery[] = ['french', 'german']

type LiverySwitchProps = {
  livery: Livery
  onChange: (livery: Livery) => void
}

function LiverySwitch({ livery, onChange }: LiverySwitchProps) {
  const { t } = useTranslation()

  return (
    <div className="livery-switch" role="group" aria-label={t('liveries.label')}>
      {LIVERIES.map((name) => (
        <button key={name} type="button" aria-pressed={livery === name} onClick={() => onChange(name)}>
          {t(`liveries.${name}`)}
        </button>
      ))}
    </div>
  )
}

export default LiverySwitch
