import { useTranslation } from 'react-i18next'
import type { GuideStep } from './guideSteps'

type Props = {
  step: Exclude<GuideStep, 'welcome'>
  /** Ends the guide: because the player has done the round of it, or because they do not want it. */
  onEnd: () => void
}

/** What to do next on the first day: the step, in a few lines, with a way to skip the whole guide. */
function Guide({ step, onEnd }: Props) {
  const { t } = useTranslation()

  return (
    <aside className="guide" aria-live="polite">
      <strong>{t(`guide.${step}.title`)}</strong>
      <p>{t(`guide.${step}.text`)}</p>
      <div className="guide-actions">
        {step === 'free' && (
          <button type="button" className="go" onClick={onEnd}>
            {t('guide.understood')}
          </button>
        )}
        <button type="button" onClick={onEnd}>
          {t('guide.skip')}
        </button>
      </div>
    </aside>
  )
}

export default Guide
