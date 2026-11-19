import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import GameWindow from './GameWindow'
import Icon from './Icon'
import Pane from './Pane'
import { CHOOSABLE_SITES_URL, campStateKey, useSites } from './useSites'
import WorldMap from './WorldMap'

type Props = {
  /** Takes the site; returns the code of the error the API gave, or null when the base is the player's. */
  onClaim: (site: string) => Promise<string | null>
}

/** Where a new player picks the site of their base on the map, among those still free; the window stays until they have. */
function BaseChoice({ onClaim }: Props) {
  const { t } = useTranslation()
  const [sitesVersion, setSitesVersion] = useState(0)
  const sites = useSites(CHOOSABLE_SITES_URL, sitesVersion)
  const [selected, setSelected] = useState<string | null>(null)
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

  const chosen = sites.find(({ site }) => site === selected)

  return (
    <GameWindow title={t('world.choose.title')} hint={t('world.choose.hint')}>
      <Pane title={t('world.sites')}>
        {errorCode !== null && (
          <p className="game-message" role="alert">
            {t(`base.errors.${errorCode}`)}
          </p>
        )}
        <div className="world-choice">
          {chosen === undefined ? (
            <p>{t('world.pick')}</p>
          ) : (
            <>
              <strong>{t(`world.site.${chosen.site}`)}</strong>
              <span>{t(campStateKey(chosen.free, chosen.holder))}</span>
              <button type="button" className="go" disabled={!chosen.free} onClick={() => claim(chosen.site)}>
                <Icon name="site" />
                {t('world.claim')}
              </button>
            </>
          )}
        </div>
        <WorldMap sites={sites} selected={selected} onSelect={setSelected} />
      </Pane>
    </GameWindow>
  )
}

export default BaseChoice
