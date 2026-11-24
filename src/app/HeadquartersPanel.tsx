import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { sitePlace } from '../plans/franceMap'
import CampCard from './CampCard'
import type { BusyCrews } from './flights'
import Pane from './Pane'
import type { AttackKind, AttackTarget, Cargo, Destination, HeldBase, Squadron } from './useBase'
import { INSTANCE_SITES_URL, useSites } from './useSites'
import WorldMap from './WorldMap'

// A camp on the right half of the map has its card on the left, and the other way round.
const MIDDLE_PERCENT = 50

type Props = {
  bases: HeldBase[]
  /** The site of the base the player looks at. */
  currentSite: string
  /** How many bases a player can hold. */
  baseLimit: number
  squadron: Squadron
  unavailable: BusyCrews
  /** Where an aircraft can go: the player's own bases, the allies' and the free camps. */
  destinations: Destination[]
  /** The enemy camps that can be attacked, and the order that sends an attack against one. */
  targets: AttackTarget[]
  onAttack: (targetBaseId: number, kind: AttackKind, pilotIds: number[], aircraftIds: number[]) => Promise<string | null>
  onStation: (destinationBaseId: number, pilotId: number, aircraftId: number, fuel: number, ammunition: number) => Promise<string | null>
  onSupply: (destinationBaseId: number, pilotId: number, aircraftId: number, cargo: Cargo) => Promise<string | null>
}

/** The map of France with the camps of the player's world, the French and the Germans: theirs are ringed in gold, their allies' in green, the enemy's are greyed. A camp picked on the map shows its card on the other side of the map, where aircraft are sent to it. */
function HeadquartersPanel({ bases, currentSite, baseLimit, squadron, unavailable, destinations, targets, onAttack, onStation, onSupply }: Props) {
  const { t } = useTranslation()
  const sites = useSites(INSTANCE_SITES_URL)
  const [selectedSite, setSelectedSite] = useState<string | null>(null)

  if (sites === null) {
    return null
  }

  const ownSites = bases.map((base) => base.site)
  const ownClan = sites.find((camp) => camp.site === ownSites[0])!.clan
  const selected = sites.find((camp) => camp.site === selectedSite)

  return (
    <Pane title={t('world.map')}>
      <p className="world-legend">{t('world.side', { side: t(`world.clan.${ownClan}`) })}</p>
      <p className="world-legend">{t('world.legend')}</p>
      <div className="hq-layout" data-card-side={selected !== undefined && sitePlace(selected.site).left >= MIDDLE_PERCENT ? 'left' : 'right'}>
        <WorldMap sites={sites} selected={selectedSite} onSelect={setSelectedSite} canSelectTaken ownSites={ownSites} ownClan={ownClan} />
        {selected === undefined ? (
          <p className="world-legend">{t('camp.pick')}</p>
        ) : (
          <CampCard
            camp={selected}
            ownSites={ownSites}
            currentSite={currentSite}
            ownClan={ownClan}
            baseLimit={baseLimit}
            squadron={squadron}
            unavailable={unavailable}
            destination={destinations.find((destination) => destination.site === selected.site)}
            target={targets.find((target) => target.site === selected.site)}
            onAttack={onAttack}
            onStation={onStation}
            onSupply={onSupply}
          />
        )}
      </div>
    </Pane>
  )
}

export default HeadquartersPanel
