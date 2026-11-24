import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRankName } from './ClanContext'
import type { BusyCrews } from './flights'
import Icon from './Icon'
import OrderButton from './OrderButton'
import Pane from './Pane'
import { crewShortage, freeCrewOf, loadShortage } from './shortages'
import type { Base, Offer, Squadron } from './useBase'

type Props = {
  offer: Offer
  squadron: Squadron
  /** The stocks that the fuel and the ammunition are taken from. */
  resources: Base['resources']
  busy: BusyCrews
  onLaunch: (pilotIds: number[], aircraftIds: number[], fuel: number, ammunition: number) => Promise<string | null>
}

/** The first free ids, one for each place, and null for a place left without any. */
function firstChoices(freeIds: number[], places: number): (number | null)[] {
  const choices: (number | null)[] = []
  for (let place = 0; place < places; place += 1) {
    choices.push(freeIds[place] ?? null)
  }
  return choices
}

function placesUpTo(count: number): number[] {
  const places: number[] = []
  for (let place = 0; place < count; place += 1) {
    places.push(place)
  }
  return places
}

function chosenIds(choices: (number | null)[]): number[] {
  const ids: number[] = []
  for (const choice of choices) {
    if (choice !== null) {
      ids.push(choice)
    }
  }
  return ids
}

/** Where a mission is prepared: a pilot and an aircraft for each place, the load of each aircraft, and the launch. */
function MissionBriefing({ offer, squadron, resources, busy, onLaunch }: Props) {
  const { t } = useTranslation()
  const rankName = useRankName()
  const { freePilots, freeAircraft } = freeCrewOf(offer, squadron, busy)
  const places = placesUpTo(offer.aircraftCount)
  const [pilotChoices, setPilotChoices] = useState(() =>
    firstChoices(
      freePilots.map((pilot) => pilot.id),
      offer.aircraftCount,
    ),
  )
  const [aircraftChoices, setAircraftChoices] = useState(() =>
    firstChoices(
      freeAircraft.map((aircraft) => aircraft.id),
      offer.aircraftCount,
    ),
  )
  const [fuel, setFuel] = useState(offer.fuelPerAircraft)
  const [ammunition, setAmmunition] = useState(offer.ammunitionPerAircraft)
  const pilotIds = chosenIds(pilotChoices)
  const aircraftIds = chosenIds(aircraftChoices)
  const canLaunch = pilotIds.length === offer.aircraftCount && aircraftIds.length === offer.aircraftCount
  const launchReason = crewShortage(offer, squadron, busy) ?? (canLaunch ? loadShortage(offer, resources, fuel, ammunition) : 'base.mission.chooseCrew')

  function choose(choices: (number | null)[], place: number, value: string): (number | null)[] {
    const next = [...choices]
    next[place] = value === '' ? null : Number(value)
    return next
  }

  return (
    <Pane title={t('base.mission.briefing', { type: t(`base.mission.types.${offer.type}`) })}>
      <div className="briefing">
        {places.map((place) => (
          <fieldset key={place}>
            <legend>{t('base.mission.slot', { number: place + 1 })}</legend>
            <label>
              {t('base.mission.pilot')}
              <select value={pilotChoices[place] ?? ''} onChange={(event) => setPilotChoices(choose(pilotChoices, place, event.target.value))}>
                <option value="">—</option>
                {freePilots.map((pilot) => (
                  <option key={pilot.id} value={pilot.id} disabled={pilotChoices.includes(pilot.id) && pilotChoices[place] !== pilot.id}>
                    {pilot.name}, {rankName(pilot.rank)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('base.mission.aircraft')}
              <select value={aircraftChoices[place] ?? ''} onChange={(event) => setAircraftChoices(choose(aircraftChoices, place, event.target.value))}>
                <option value="">—</option>
                {freeAircraft.map((aircraft) => (
                  <option key={aircraft.id} value={aircraft.id} disabled={aircraftChoices.includes(aircraft.id) && aircraftChoices[place] !== aircraft.id}>
                    {t('base.mission.aircraftOption', { name: aircraft.model.name, number: aircraft.number, durability: aircraft.durability })}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>
        ))}
        <div className="briefing-load">
          <label>
            {t('base.mission.fuelLoad')}
            <input type="number" min={0} value={fuel} onChange={(event) => setFuel(Number(event.target.value))} />
          </label>
          <label>
            {t('base.mission.ammunitionLoad')}
            <input type="number" min={0} value={ammunition} onChange={(event) => setAmmunition(Number(event.target.value))} />
          </label>
        </div>
        <OrderButton className="go" reasonKey={launchReason} onOrder={() => onLaunch(pilotIds, aircraftIds, fuel, ammunition)}>
          <Icon name={offer.type} />
          {t('base.mission.launch')}
        </OrderButton>
      </div>
    </Pane>
  )
}

export default MissionBriefing
