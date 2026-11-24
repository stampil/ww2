import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import CrewFields from './CrewFields'
import type { BusyCrews } from './flights'
import { formatDuration } from './formatDuration'
import Gauge from './Gauge'
import Icon from './Icon'
import OrderButton from './OrderButton'
import type { AttackKind, AttackTarget, Squadron } from './useBase'
import { useCrewChoice } from './useCrewChoice'

// How many aircraft a raid takes at most, as on the server.
const MAX_RAID_AIRCRAFT = 3
const FULL_DEFENSE = 100
const BACK_AND_FORTH = 2

type Props = {
  squadron: Squadron
  /** The pilots and the aircraft that cannot go now: they fly, rest, are stationed away or need the hangar. */
  unavailable: BusyCrews
  /** The enemy camp, with its defense and what refuses an attack on it now. */
  target: AttackTarget
  onAttack: (targetBaseId: number, kind: AttackKind, pilotIds: number[], aircraftIds: number[]) => Promise<string | null>
}

/** The two ways to attack an enemy camp: a raid by a few aircraft, which wears its defense down, and a capture by one aircraft, which takes the camp once its defense is down. */
function AttackForm({ squadron, unavailable, target, onAttack }: Props) {
  const { t } = useTranslation()
  const crew = useCrewChoice(squadron, unavailable)
  const [aircraftCount, setAircraftCount] = useState(1)
  const raidAircraftMax = Math.min(MAX_RAID_AIRCRAFT, crew.freeAircraft.length, crew.freePilots.length)
  const raidAircraft = Math.min(aircraftCount, raidAircraftMax)
  const canCapture = crew.aircraft !== undefined && crew.pilot !== undefined

  function raid(): Promise<string | null> {
    return onAttack(
      target.baseId,
      'raid',
      crew.freePilots.slice(0, raidAircraft).map((pilot) => pilot.id),
      crew.freeAircraft.slice(0, raidAircraft).map((aircraft) => aircraft.id),
    )
  }

  async function capture(): Promise<string | null> {
    if (crew.aircraft === undefined || crew.pilot === undefined) {
      return null
    }
    return onAttack(target.baseId, 'campCapture', [crew.pilot.id], [crew.aircraft.id])
  }

  return (
    <section className="camp-section attack-form">
      <Gauge label={t('attack.defense', { defense: target.defense })} value={target.defense} max={FULL_DEFENSE} higherIsBetter />
      <h5>{t('attack.raidTitle')}</h5>
      <p className="squadron-hint">{t('attack.raidText')}</p>
      <div className="gift-form">
        <label>
          <span>{t('attack.count')}</span>
          <input type="number" min={1} max={Math.max(1, raidAircraftMax)} value={raidAircraft} onChange={(event) => setAircraftCount(Number(event.target.value))} />
        </label>
        <OrderButton disabled={target.raidRefusal !== null || raidAircraftMax < 1} onOrder={raid}>
          <Icon name="raid" />
          {t('attack.raidSend', { count: raidAircraft, time: formatDuration(BACK_AND_FORTH * target.flightSeconds) })}
        </OrderButton>
      </div>
      {target.raidRefusal !== null && <p className="squadron-hint">{t(`base.errors.${target.raidRefusal}`)}</p>}
      <h5>{t('attack.captureTitle')}</h5>
      <p className="squadron-hint">{t('attack.captureText')}</p>
      <div className="gift-form">
        <CrewFields crew={crew} />
        <OrderButton disabled={target.captureRefusal !== null || !canCapture} onOrder={capture}>
          <Icon name="campCapture" />
          {t('attack.captureSend', { time: formatDuration(target.flightSeconds) })}
        </OrderButton>
      </div>
      {target.captureRefusal !== null && <p className="squadron-hint">{t(`base.errors.${target.captureRefusal}`)}</p>}
      {!canCapture && <p className="squadron-hint">{t('attack.nobodyFree')}</p>}
    </section>
  )
}

export default AttackForm
