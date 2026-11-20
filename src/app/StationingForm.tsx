import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import CrewFields from './CrewFields'
import type { BusyCrews } from './flights'
import { formatDuration } from './formatDuration'
import { HOLD_LIMIT } from './holdLimit'
import Icon from './Icon'
import type { Destination, Squadron } from './useBase'
import { useCrewChoice } from './useCrewChoice'

type Props = {
  squadron: Squadron
  /** The pilots and the aircraft that cannot go now: they fly, rest, are stationed away or need the hangar. */
  unavailable: BusyCrews
  /** The camp the aircraft is sent to. */
  destination: Destination
  onStation: (destinationBaseId: number, pilotId: number, aircraftId: number, fuel: number, ammunition: number) => void
}

/** An aircraft and a pilot sent to stand at a camp, with fuel and ammunition for it, until they are recalled. */
function StationingForm({ squadron, unavailable, destination, onStation }: Props) {
  const { t } = useTranslation()
  const crew = useCrewChoice(squadron, unavailable)
  const [fuel, setFuel] = useState(0)
  const [ammunition, setAmmunition] = useState(0)

  function station(): void {
    if (crew.aircraft === undefined || crew.pilot === undefined) {
      return
    }
    onStation(destination.id, crew.pilot.id, crew.aircraft.id, fuel, ammunition)
  }

  return (
    <section className="camp-section">
      <h5>{t('stationing.title')}</h5>
      <p className="squadron-hint">{t('stationing.text')}</p>
      <div className="gift-form">
        <CrewFields crew={crew} />
        <label>
          <span>{t('stationing.fuel')}</span>
          <input type="number" min={0} max={HOLD_LIMIT} value={fuel} onChange={(event) => setFuel(Number(event.target.value))} />
        </label>
        <label>
          <span>{t('stationing.ammunition')}</span>
          <input type="number" min={0} max={HOLD_LIMIT} value={ammunition} onChange={(event) => setAmmunition(Number(event.target.value))} />
        </label>
        <button type="button" disabled={crew.aircraft === undefined || crew.pilot === undefined} onClick={station}>
          <Icon name="site" />
          {t('stationing.send', { time: formatDuration(destination.flightSeconds) })}
        </button>
      </div>
      {(crew.aircraft === undefined || crew.pilot === undefined) && <p className="squadron-hint">{t('stationing.nobodyFree')}</p>}
    </section>
  )
}

export default StationingForm
