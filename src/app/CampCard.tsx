import { useTranslation } from 'react-i18next'
import type { BusyCrews } from './flights'
import Icon from './Icon'
import Pane from './Pane'
import AttackForm from './AttackForm'
import StationingForm from './StationingForm'
import SupplyForm from './SupplyForm'
import type { AttackKind, AttackTarget, Cargo, Destination, Squadron } from './useBase'
import type { SiteChoice } from './useSites'

const STOCKS = ['supplies', 'fuel', 'ammunition', 'materials'] as const

type Props = {
  camp: SiteChoice
  /** The sites of the bases of the player, and the one they look at now. */
  ownSites: string[]
  currentSite: string
  ownClan: string
  /** How many bases a player can hold. */
  baseLimit: number
  squadron: Squadron
  unavailable: BusyCrews
  /** The camp as a place an aircraft can be sent to; none for the base itself and for the enemy's camps. */
  destination: Destination | undefined
  /** The camp as something to attack; none unless an enemy player holds it. */
  target: AttackTarget | undefined
  onAttack: (targetBaseId: number, kind: AttackKind, pilotIds: number[], aircraftIds: number[]) => void
  onStation: (destinationBaseId: number, pilotId: number, aircraftId: number, fuel: number, ammunition: number) => void
  onSupply: (destinationBaseId: number, pilotId: number, aircraftId: number, cargo: Cargo) => void
}

/** The detail of a camp picked on the map: who holds it, what it keeps and how many aircraft stand there, and the orders that send an aircraft to it, to stand there or to bring it resources, or against it, for a raid or a capture. */
function CampCard({ camp, ownSites, currentSite, ownClan, baseLimit, squadron, unavailable, destination, target, onAttack, onStation, onSupply }: Props) {
  const { t } = useTranslation()
  const held = camp.resources
  let relation = t('world.free')
  if (ownSites.includes(camp.site)) {
    relation = t('world.relation.own')
  } else if (camp.holder !== null) {
    relation = t(camp.clan === ownClan ? 'world.relation.ally' : 'world.relation.enemy', { holder: camp.holder })
  }

  return (
    <aside className="camp-card" data-clan={camp.clan}>
      <Pane title={t(`world.airfield.${camp.site}`)}>
        <p className="squadron-hint">
          {t(`world.clan.${camp.clan}`)} : {relation}
        </p>
        <ul className="stats">
          <li title={t('camp.aircraft')}>
            <Icon name="aircraft" />
            {camp.aircraft}
            <span className="visually-hidden">{t('camp.aircraft')}</span>
          </li>
          {held !== null &&
            STOCKS.map((stock) => (
              <li key={stock} title={t(`base.resources.${stock}`)}>
                <Icon name={stock} />
                {held[stock]}
                <span className="visually-hidden">{t(`base.resources.${stock}`)}</span>
              </li>
            ))}
        </ul>
        {camp.site === currentSite && <p className="squadron-hint">{t('camp.here')}</p>}
        {camp.site !== currentSite && destination === undefined && target === undefined && <p className="squadron-hint">{t('camp.enemy')}</p>}
        {target !== undefined && <AttackForm squadron={squadron} unavailable={unavailable} target={target} onAttack={onAttack} />}
        {destination?.kinship === 'free' && <p className="squadron-hint">{t('world.landToClaim', { max: baseLimit })}</p>}
        {destination !== undefined && <StationingForm squadron={squadron} unavailable={unavailable} destination={destination} onStation={onStation} />}
        {destination !== undefined && destination.kinship !== 'free' && <SupplyForm squadron={squadron} unavailable={unavailable} destination={destination} onSupply={onSupply} />}
      </Pane>
    </aside>
  )
}

export default CampCard
