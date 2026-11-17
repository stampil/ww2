import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import GameWindow from './GameWindow'
import Icon from './Icon'
import Pane from './Pane'
import { useSites } from './useSites'

type Props = {
  /** Takes the site; returns the code of the error the API gave, or null when the base is the player's. */
  onClaim: (site: string) => Promise<string | null>
}

/** Where a new player picks the site of their base among those still free; the window stays until they have. */
function BaseChoice({ onClaim }: Props) {
  const { t } = useTranslation()
  const [sitesVersion, setSitesVersion] = useState(0)
  const sites = useSites(sitesVersion)
  const [errorCode, setErrorCode] = useState<string | null>(null)

  const claim = (site: string) => {
    void onClaim(site).then((code) => {
      setErrorCode(code)
      if (code !== null) {
        setSitesVersion(sitesVersion + 1)
      }
    })
  }

  if (sites === null) {
    return null
  }

  return (
    <GameWindow title={t('world.choose.title')} hint={t('world.choose.hint')}>
      <Pane title={t('world.sites')}>
        {errorCode !== null && (
          <p className="game-message" role="alert">
            {t(`base.errors.${errorCode}`)}
          </p>
        )}
        <ul className="cards">
          {sites.map(({ site, free }) => (
            <li key={site} className="card">
              <div className="card-head">
                <span className="portrait" aria-hidden="true">
                  <Icon name="site" />
                </span>
                <div>
                  <strong>{t(`world.site.${site}`)}</strong>
                  <span>{t(free ? 'world.free' : 'world.taken')}</span>
                </div>
              </div>
              <div className="card-actions">
                <button type="button" className="go" disabled={!free} onClick={() => claim(site)}>
                  <Icon name="site" />
                  {t('world.claim')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Pane>
    </GameWindow>
  )
}

export default BaseChoice
