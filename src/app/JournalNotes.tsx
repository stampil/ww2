import { useTranslation } from 'react-i18next'
import type { BaseEvent, CampEvent, ExplosionEvent, GiftEvent, LandingEvent, MissionReport, RaidedEvent } from './useBase'

// The resources an aircraft can unload, in the order the journal lists them.
const LOADS = ['supplies', 'fuel', 'ammunition', 'materials'] as const

function ExplosionItem({ event }: { event: ExplosionEvent }) {
  const { t } = useTranslation()
  const key = event.pilotName === null ? 'base.event.explosionAlone' : event.pilotKilled ? 'base.event.explosionKilled' : 'base.event.explosionSafe'

  return (
    <li>
      <strong>{t('base.event.explosion')}</strong>
      <span>{t(key, { aircraft: event.aircraftName, pilot: event.pilotName })}</span>
    </li>
  )
}

function GiftItem({ event }: { event: GiftEvent }) {
  const { t } = useTranslation()
  const giver = { from: event.from, site: t(`world.site.${event.site}`) }
  let text: string
  if (event.item === 'pilot') {
    text = t('base.event.giftPilot', { ...giver, name: event.name })
  } else if (event.item === 'aircraft') {
    text = t('base.event.giftAircraft', { ...giver, name: event.name })
  } else {
    text = t('base.event.giftResource', { ...giver, quantity: event.quantity, resource: t(`base.resources.${event.item}`) })
  }

  return (
    <li>
      <strong>{t('base.event.gift')}</strong>
      <span>{text}</span>
    </li>
  )
}

function LandingItem({ event }: { event: LandingEvent }) {
  const { t, i18n } = useTranslation()
  const delivered = LOADS.filter((resource) => (event[resource] ?? 0) > 0)
  const load = new Intl.ListFormat(i18n.language).format(delivered.map((resource) => t('base.event.loadItem', { quantity: event[resource], resource: t(`base.resources.${resource}`).toLowerCase() })))

  return (
    <li>
      <strong>{t('base.event.landing')}</strong>
      <span>{t('base.event.landingLoad', { from: event.from, site: t(`world.site.${event.site}`), aircraft: event.aircraftName, load })}</span>
    </li>
  )
}

function CampItem({ event }: { event: CampEvent }) {
  const { t } = useTranslation()
  const site = t(`world.site.${event.site}`)
  const text = event.kind === 'campLost' && event.capturedBy !== undefined ? t('base.event.campLostCaptured', { by: event.capturedBy, site }) : t(`base.event.${event.kind}Text`, { site })

  return (
    <li>
      <strong>{t(`base.event.${event.kind}`)}</strong>
      <span>{text}</span>
    </li>
  )
}

function RaidedItem({ event }: { event: RaidedEvent }) {
  const { t } = useTranslation()
  const consequences = [t('base.event.raidedText', { by: event.by, site: t(`world.site.${event.site}`), defenseLost: event.defenseLost })]
  if (event.building !== null) {
    consequences.push(t('base.event.raidedBuilding', { building: t(`base.building.${event.building}.name`) }))
  }
  if (event.aircraftLost) {
    consequences.push(t('base.event.raidedAircraft'))
  }

  return (
    <li>
      <strong>{t('base.event.raided')}</strong>
      <span>{consequences.join(' ')}</span>
    </li>
  )
}

/** A page of the journal that tells no flight: an aircraft that exploded on the runway, a gift from another base, an aircraft that landed with a load, a camp taken or let go, or a raid on the camp. */
export function JournalNote({ event }: { event: Exclude<BaseEvent, MissionReport> }) {
  if (event.kind === 'gift') {
    return <GiftItem event={event} />
  }
  if (event.kind === 'landing') {
    return <LandingItem event={event} />
  }
  if (event.kind === 'campTaken' || event.kind === 'campLost') {
    return <CampItem event={event} />
  }
  if (event.kind === 'raided') {
    return <RaidedItem event={event} />
  }
  return <ExplosionItem event={event} />
}
