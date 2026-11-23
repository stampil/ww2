import { useTranslation } from 'react-i18next'
import Icon from './Icon'

type Props = {
  /** What it costs in materials to build the building again, and how many the camp has. */
  cost: number
  materials: number
  onRebuild: () => void
}

/** What a destroyed building shows in its window: that it is no use as it is, and the order that builds it again. */
function RebuildNotice({ cost, materials, onRebuild }: Props) {
  const { t } = useTranslation()

  return (
    <section className="rebuild-notice">
      <h4>
        <Icon name="warning" />
        {t('base.rebuild.title')}
      </h4>
      <p>{t('base.rebuild.text')}</p>
      <button type="button" disabled={materials < cost} onClick={onRebuild}>
        {t('base.rebuild.button', { cost })}
      </button>
    </section>
  )
}

export default RebuildNotice
