import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import CrewFields from './CrewFields'
import type { BusyCrews } from './flights'
import { formatDuration } from './formatDuration'
import { HOLD_LIMIT } from './holdLimit'
import Icon from './Icon'
import OrderButton from './OrderButton'
import type { Cargo, Destination, Squadron } from './useBase'
import { useCrewChoice } from './useCrewChoice'

const RESOURCES = ['supplies', 'fuel', 'ammunition', 'materials'] as const

type Props = {
  squadron: Squadron
  /** The pilots and the aircraft that cannot go now: they fly, rest, are stationed away or need the hangar. */
  unavailable: BusyCrews
  /** The base of the player or of an ally that the aircraft supplies. */
  destination: Destination
  onSupply: (destinationBaseId: number, pilotId: number, aircraftId: number, cargo: Cargo) => Promise<string | null>
}

/** An aircraft and a pilot that carry resources to a camp of the player's side and come back at once. */
function SupplyForm({ squadron, unavailable, destination, onSupply }: Props) {
  const { t } = useTranslation()
  const crew = useCrewChoice(squadron, unavailable)
  const [cargo, setCargo] = useState<Cargo>({ supplies: 0, fuel: 0, ammunition: 0, materials: 0 })
  const isEmpty = RESOURCES.every((resource) => cargo[resource] === 0)
  const canSupply = crew.aircraft !== undefined && crew.pilot !== undefined && !isEmpty

  async function supply(): Promise<string | null> {
    if (crew.aircraft === undefined || crew.pilot === undefined) {
      return null
    }
    return onSupply(destination.id, crew.pilot.id, crew.aircraft.id, cargo)
  }

  return (
    <section className="camp-section">
      <h5>{t('supply.title')}</h5>
      <p className="squadron-hint">{t('supply.text', { max: HOLD_LIMIT })}</p>
      <div className="gift-form">
        <CrewFields crew={crew} />
        {RESOURCES.map((resource) => (
          <label key={resource}>
            <span>{t(`base.resources.${resource}`)}</span>
            <input
              type="number"
              min={0}
              max={HOLD_LIMIT}
              value={cargo[resource]}
              onChange={(event) => setCargo({ ...cargo, [resource]: Number(event.target.value) })}
            />
          </label>
        ))}
        <OrderButton disabled={!canSupply} onOrder={supply}>
          <Icon name="supplies" />
          {t('supply.send', { time: formatDuration(2 * destination.flightSeconds) })}
        </OrderButton>
      </div>
      {(crew.aircraft === undefined || crew.pilot === undefined) && <p className="squadron-hint">{t('stationing.nobodyFree')}</p>}
    </section>
  )
}

export default SupplyForm
