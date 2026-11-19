import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { BusyCrews } from './flights'
import { formatDuration } from './formatDuration'
import Icon from './Icon'
import Pane from './Pane'
import RecipientSelect from './RecipientSelect'
import type { Recipient, Squadron } from './useBase'

type Props = {
  squadron: Squadron
  /** The pilots and the aircraft that cannot go now: they fly, rest, are stationed away or need the hangar. */
  unavailable: BusyCrews
  /** The bases an aircraft can be stationed at: the player's own and the allies'. */
  recipients: Recipient[]
  flightSeconds: number
  onStation: (destinationBaseId: number, pilotId: number, aircraftId: number, fuel: number, ammunition: number) => void
}

/** Where an aircraft and a pilot are sent to stand at another base, with fuel and ammunition for it, until they are recalled. */
function StationingForm({ squadron, unavailable, recipients, flightSeconds, onStation }: Props) {
  const { t } = useTranslation()
  const freeAircraft = squadron.aircraft.filter((aircraft) => !unavailable.aircraftIds.includes(aircraft.id))
  const freePilots = squadron.pilots.filter((pilot) => !unavailable.pilotIds.includes(pilot.id))
  const [aircraftId, setAircraftId] = useState<number | null>(null)
  const [pilotId, setPilotId] = useState<number | null>(null)
  const [destinationId, setDestinationId] = useState<number | null>(null)
  const [fuel, setFuel] = useState(0)
  const [ammunition, setAmmunition] = useState(0)
  const aircraft = freeAircraft.find((candidate) => candidate.id === aircraftId) ?? freeAircraft[0]
  const pilot = freePilots.find((candidate) => candidate.id === pilotId) ?? freePilots[0]
  const destination = recipients.find((recipient) => recipient.id === destinationId) ?? recipients[0]
  const canStation = aircraft !== undefined && pilot !== undefined

  function station(): void {
    if (aircraft === undefined || pilot === undefined) {
      return
    }
    onStation(destination.id, pilot.id, aircraft.id, fuel, ammunition)
  }

  return (
    <Pane title={t('stationing.title')}>
      <p className="squadron-hint">{t('stationing.text')}</p>
      <div className="gift-form">
        <label>
          <span>{t('stationing.aircraft')}</span>
          <select value={aircraft?.id ?? ''} onChange={(event) => setAircraftId(Number(event.target.value))}>
            {freeAircraft.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {t('base.mission.aircraftOption', { name: candidate.model.name, number: candidate.number, durability: candidate.durability })}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t('base.mission.pilot')}</span>
          <select value={pilot?.id ?? ''} onChange={(event) => setPilotId(Number(event.target.value))}>
            {freePilots.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}, {t(`squadron.ranks.${candidate.rank}`)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t('gift.to')}</span>
          <RecipientSelect recipients={recipients} value={destination.id} onChange={setDestinationId} />
        </label>
        <label>
          <span>{t('stationing.fuel')}</span>
          <input type="number" min={0} max={aircraft?.model.fuelCapacity} value={fuel} onChange={(event) => setFuel(Number(event.target.value))} />
        </label>
        <label>
          <span>{t('stationing.ammunition')}</span>
          <input type="number" min={0} max={aircraft?.model.ammunitionCapacity} value={ammunition} onChange={(event) => setAmmunition(Number(event.target.value))} />
        </label>
        <button type="button" disabled={!canStation} onClick={station}>
          <Icon name="site" />
          {t('stationing.send', { time: formatDuration(flightSeconds) })}
        </button>
      </div>
      {!canStation && <p className="squadron-hint">{t('stationing.nobodyFree')}</p>}
    </Pane>
  )
}

export default StationingForm
