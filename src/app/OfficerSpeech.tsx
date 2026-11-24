import { useContext } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ClanContext } from './ClanContext'
import Icon from './Icon'

type Props = {
  text: string
  /** The buttons under the speech. */
  children: ReactNode
}

/** What the officer who commands the base says, in a speech box with their portrait: the portrait is a silhouette until the officers are drawn. */
function OfficerSpeech({ text, children }: Props) {
  const { t } = useTranslation()
  const clan = useContext(ClanContext)!

  return (
    <div className="officer-speech">
      <span className="portrait officer-portrait" aria-hidden="true">
        <Icon name="pilot" />
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
