import { useTranslation } from 'react-i18next'
import type { GuideStep } from './guideSteps'
import OfficerSpeech from './OfficerSpeech'

type Props = {
  step: Exclude<GuideStep, 'welcome'>
  /** Ends the guide: because the player has done the round of it, or because they do not want it. */
  onEnd: () => void
}

/** What to do next on the first day: the step, said by the officer who commands the base, with a way to end the whole guide. */
function Guide({ step, onEnd }: Props) {
  const { t } = useTranslation()

  return (
    <aside className="guide" aria-live="polite">
      <strong>{t(`guide.${step}.title`)}</strong>
      <OfficerSpeech text={t(`guide.${step}.text`)}>
        {step === 'free' ? (
          <button type="button" className="go" onClick={onEnd}>
            {t('guide.understood')}
          </button>
        ) : (
          <button type="button" onClick={onEnd}>
            {t('guide.stop')}
          </button>
        )}
      </OfficerSpeech>
    </aside>
  )
}

export default Guide
