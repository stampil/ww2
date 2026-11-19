import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import Icon from './Icon'
import Pane from './Pane'
import type { HeldBase } from './useBase'
import { INSTANCE_SITES_URL, useSites } from './useSites'
import WorldMap from './WorldMap'

type Props = {
  bases: HeldBase[]
  /** How many bases a player can hold. */
  baseLimit: number
  /** Claims a free camp as an empty base; returns the code of the error the API gave, or null when the camp is the player's. */
  onClaim: (site: string) => Promise<string | null>
}

/** The map of France with the camps of the player's world: theirs are ringed in gold, their allies' in green, the enemy's are greyed; a free camp can be claimed, empty, while the player holds fewer bases than the limit. */
function HeadquartersPanel({ bases, baseLimit, onClaim }: Props) {
  const { t } = useTranslation()
  const [sitesVersion, setSitesVersion] = useState(0)
  const sites = useSites(INSTANCE_SITES_URL, sitesVersion)
  const [picked, setPicked] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)

  if (sites === null) {
    return null
  }

  const ownSites = bases.map((base) => base.site)
  const ownClan = sites.find((camp) => camp.site === ownSites[0])!.clan
  const canClaim = bases.length < baseLimit
  const chosen = sites.find((camp) => camp.site === picked)

  const claim = (site: string) => {
    void onClaim(site).then((code) => {
      setErrorCode(code)
      if (code !== null) {
        setSitesVersion(sitesVersion + 1)
      }
    })
  }

  let claimBlock: ReactNode
  if (!canClaim) {
    claimBlock = <p>{t('world.claimLimit', { max: baseLimit })}</p>
  } else if (chosen === undefined || !chosen.free) {
    claimBlock = <p>{t('world.claimPick')}</p>
  } else {
    claimBlock = (
      <>
        <strong>{t(`world.site.${chosen.site}`)}</strong>
        <span>{t('world.free')}</span>
        <button type="button" className="go" onClick={() => claim(chosen.site)}>
          <Icon name="site" />
          {t('world.claimCamp')}
        </button>
      </>
    )
  }

  return (
    <Pane title={t('world.map')}>
      {errorCode !== null && (
        <p className="game-message" role="alert">
          {t(`base.errors.${errorCode}`)}
        </p>
      )}
      <p className="world-legend">{t('world.side', { side: t(`world.clan.${ownClan}`) })}</p>
      <p className="world-legend">{t('world.legend')}</p>
      <div className="world-choice">{claimBlock}</div>
      <WorldMap sites={sites} selected={picked} onSelect={canClaim ? setPicked : undefined} ownSites={ownSites} ownClan={ownClan} />
      <ul className="world-holders">
        {sites.map((camp) => {
          let relation = t('world.free')
          if (ownSites.includes(camp.site)) {
            relation = t('world.relation.own')
          } else if (camp.holder !== null) {
            relation = t(camp.clan === ownClan ? 'world.relation.ally' : 'world.relation.enemy', { holder: camp.holder })
          }
          return (
            <li key={camp.site}>
              <strong>{t(`world.site.${camp.site}`)}</strong> : {relation}
            </li>
          )
        })}
      </ul>
    </Pane>
  )
}

export default HeadquartersPanel
