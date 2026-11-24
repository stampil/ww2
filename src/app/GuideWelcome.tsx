import { useTranslation } from 'react-i18next'
import { assetUrl } from '../assetUrl'
import { useClan } from './ClanContext'
import GameWindow from './GameWindow'
import Icon from './Icon'
import OfficerSpeech from './OfficerSpeech'
import type { Clan } from './useBase'

const OFFICE_IMAGES: Record<Clan, string> = {
  french: assetUrl('sprites/guide/office-french.jpg'),
  axe: assetUrl('sprites/guide/office-german.jpg'),
}

type Props = {
  onBegin: () => void
  onSkip: () => void
}

/** The first window of a new player: the officer who commands the base, in his office, says where they are, what they must achieve and what the journal is, and offers the guide for the first day. */
function GuideWelcome({ onBegin, onSkip }: Props) {
  const { t } = useTranslation()
  const clan = useClan()

  return (
    <GameWindow title={t('guide.welcome.title')} hint={t('guide.welcome.hint')} onDismiss={onBegin}>
      <div className="guide-welcome" style={{ backgroundImage: `url(${OFFICE_IMAGES[clan]})` }}>
        <OfficerSpeech text={t('guide.welcome.text')}>
          <button type="button" className="go" onClick={onBegin}>
            <Icon name="battle" />
            {t('guide.welcome.begin')}
          </button>
          <button type="button" onClick={onSkip}>
            {t('guide.welcome.decline')}
          </button>
        </OfficerSpeech>
      </div>
    </GameWindow>
  )
}

export default GuideWelcome
