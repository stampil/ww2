import { useTranslation } from 'react-i18next'
import GameWindow from './GameWindow'
import Icon from './Icon'

type Props = {
  onBegin: () => void
  onSkip: () => void
}

/** The first window of a new player: where they are, what they must achieve, and an offer of the guide for the first day. */
function GuideWelcome({ onBegin, onSkip }: Props) {
  const { t } = useTranslation()

  return (
    <GameWindow title={t('guide.welcome.title')} hint={t('guide.welcome.hint')} onDismiss={onBegin}>
      <div className="guide-welcome">
        <p>{t('guide.welcome.text')}</p>
        <div className="guide-actions">
          <button type="button" className="go" onClick={onBegin}>
            <Icon name="battle" />
            {t('guide.welcome.begin')}
          </button>
          <button type="button" onClick={onSkip}>
            {t('guide.skip')}
          </button>
        </div>
      </div>
    </GameWindow>
  )
}

export default GuideWelcome
