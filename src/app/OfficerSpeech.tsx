import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { assetUrl } from '../assetUrl'
import { useClan } from './ClanContext'
import type { Clan } from './useBase'

const OFFICER_IMAGES: Record<Clan, string> = {
  french: assetUrl('sprites/officers/officer-french.png'),
  axe: assetUrl('sprites/officers/officer-german.png'),
}

type Props = {
  text: string
  /** The buttons under the speech. */
  children: ReactNode
}

/** What the officer who commands the base says, in a speech box with their portrait. */
function OfficerSpeech({ text, children }: Props) {
  const { t } = useTranslation()
  const clan = useClan()

  return (
    <div className="officer-speech">
      <span className="portrait officer-portrait" aria-hidden="true">
        <img src={OFFICER_IMAGES[clan]} alt="" draggable={false} />
      </span>
      <div className="officer-speech-body">
        <span className="officer-title">{t(`guide.officer.${clan}`)}</span>
        <p>{text}</p>
        <div className="guide-actions">{children}</div>
      </div>
    </div>
  )
}

export default OfficerSpeech
