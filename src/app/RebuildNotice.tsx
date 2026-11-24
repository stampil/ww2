import { useTranslation } from 'react-i18next'
import Icon from './Icon'
import OrderButton from './OrderButton'
import { rebuildShortage } from './shortages'

type Props = {
  /** What it costs in materials to build the building again, and how many the camp has. */
  cost: number
  materials: number
  onRebuild: () => Promise<string | null>
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
      <OrderButton reasonKey={rebuildShortage(materials, cost)} onOrder={onRebuild}>
        {t('base.rebuild.button', { cost })}
      </OrderButton>
    </section>
  )
}

export default RebuildNotice
