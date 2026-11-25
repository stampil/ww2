import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { BusyCrews } from './flights'
import { formatDuration } from './formatDuration'
import Gauge from './Gauge'
import Icon from './Icon'
import OrderButton from './OrderButton'
import type { AttackKind, AttackTarget, Squadron } from './useBase'
import { useCrewChoice } from './useCrewChoice'

// How many aircraft a raid and a capture take at most, as on the server.
const MAX_RAID_AIRCRAFT = 3
const MAX_CAPTURE_AIRCRAFT = 6
const FULL_DEFENSE = 100
const BACK_AND_FORTH = 2

type Props = {
  squadron: Squadron
  /** The pilots and the aircraft that cannot go now: they fly, rest, are stationed away or need the hangar. */
  unavailable: BusyCrews
  /** The enemy camp, with its defense, the aircraft that defend it and what refuses an attack on it now. */
  target: AttackTarget
  onAttack: (targetBaseId: number, kind: AttackKind, pilotIds: number[], aircraftIds: number[]) => Promise<string | null>
}

/** The two ways to attack an enemy camp: a raid by a few aircraft, which wears its defense down, and a capture by as many aircraft as the hangar holds, which fight one combat for each aircraft that defends the camp and take it if they win them all. */
function AttackForm({ squadron, unavailable, target, onAttack }: Props) {
  const { t } = useTranslation()
  const crew = useCrewChoice(squadron, unavailable)
  const [raidCount, setRaidCount] = useState(1)
  const [captureCount, setCaptureCount] = useState(1)
  const freeCrews = Math.min(crew.freeAircraft.length, crew.freePilots.length)
  const raidAircraftMax = Math.min(MAX_RAID_AIRCRAFT, freeCrews)
  const captureAircraftMax = Math.min(MAX_CAPTURE_AIRCRAFT, freeCrews)
  const raidAircraft = Math.min(raidCount, raidAircraftMax)
  const captureAircraft = Math.min(captureCount, captureAircraftMax)

  function send(kind: AttackKind, aircraftCount: number): Promise<string | null> {
    return onAttack(
      target.baseId,
      kind,
      crew.freePilots.slice(0, aircraftCount).map((pilot) => pilot.id),
      crew.freeAircraft.slice(0, aircraftCount).map((aircraft) => aircraft.id),
    )
  }

  return (
    <section className="camp-section attack-form">
      <Gauge label={t('attack.defense', { defense: target.defense })} value={target.defense} max={FULL_DEFENSE} higherIsBetter />
      <h5>{t('attack.raidTitle')}</h5>
      <p className="squadron-hint">{t('attack.raidText')}</p>
      <div className="gift-form">
        <label>
          <span>{t('attack.count')}</span>
          <input type="number" min={1} max={Math.max(1, raidAircraftMax)} value={raidAircraft} onChange={(event) => setRaidCount(Number(event.target.value))} />
        </label>
        <OrderButton disabled={target.raidRefusal !== null || raidAircraftMax < 1} onOrder={() => send('raid', raidAircraft)}>
          <Icon name="raid" />
          {t('attack.raidSend', { count: raidAircraft, time: formatDuration(BACK_AND_FORTH * target.flightSeconds) })}
        </OrderButton>
      </div>
      {target.raidRefusal !== null && <p className="squadron-hint">{t(`base.errors.${target.raidRefusal}`)}</p>}
      <h5>{t('attack.captureTitle')}</h5>
      <p className="squadron-hint">{t('attack.captureText')}</p>
      <p className="squadron-hint">{t('attack.defenders', { defenders: target.defenders })}</p>
      <div className="gift-form">
        <label>
          <span>{t('attack.captureCount')}</span>
          <input type="number" min={1} max={Math.max(1, captureAircraftMax)} value={captureAircraft} onChange={(event) => setCaptureCount(Number(event.target.value))} />
        </label>
        <OrderButton disabled={target.captureRefusal !== null || captureAircraftMax < 1} onOrder={() => send('campCapture', captureAircraft)}>
          <Icon name="campCapture" />
          {t('attack.captureSend', { count: captureAircraft, time: formatDuration(target.flightSeconds) })}
        </OrderButton>
      </div>
      {target.captureRefusal !== null && <p className="squadron-hint">{t(`base.errors.${target.captureRefusal}`)}</p>}
      {freeCrews < 1 && <p className="squadron-hint">{t('attack.nobodyFree')}</p>}
    </section>
  )
}

export default AttackForm
