import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { GAME_TIME_ZONE } from './gameDate'
import Icon from './Icon'
import type { IconName } from './iconPaths'
import type { Base } from './useBase'

const RESOURCES = ['supplies', 'fuel', 'ammunition', 'materials', 'commandPoints'] as const

function HudItem({ icon, label, children }: { icon: IconName; label: string; children: ReactNode }) {
  return (
    <span className="hud-item" title={label}>
      <Icon name={icon} />
      <span className="visually-hidden">{label}</span>
      <strong>{children}</strong>
    </span>
  )
}

type Props = {
  gameTime: Date
  base: Base
  /** Called with the id of the base the player picks to look at. */
  onSelectBase: (baseId: number) => void
}

/** The strip over the map: the site of the base, or one button for each base the player holds, the game time, the aircraft and the pilots, the resources, and the battle, each with its icon. */
function Hud({ gameTime, base, onSelectBase }: Props) {
  const { t, i18n } = useTranslation()
  const formatter = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'medium', timeZone: GAME_TIME_ZONE })

  return (
    <div className="hud" role="group" aria-label={t('base.hud')}>
      {base.bases.length > 1 ? (
        <span className="hud-bases" role="group" aria-label={t('base.switch')}>
          {base.bases.map((held) => (
            <button key={held.id} type="button" className="hud-base" aria-pressed={held.id === base.baseId} onClick={() => onSelectBase(held.id)}>
              {t(`world.site.${held.site}`)}
            </button>
          ))}
        </span>
      ) : (
        <HudItem icon="site" label={t('base.site')}>
          {t(`world.site.${base.site}`)}
        </HudItem>
      )}
      <HudItem icon="clock" label={t('base.clock.label')}>
        <time dateTime={gameTime.toISOString()}>{formatter.format(gameTime)}</time>
      </HudItem>
      <HudItem icon="aircraft" label={t('squadron.aircraft')}>
        {base.squadron.aircraft.length}
      </HudItem>
      <HudItem icon="pilot" label={t('squadron.pilots')}>
        {base.squadron.pilots.length}
      </HudItem>
      {RESOURCES.map((resource) => (
        <HudItem key={resource} icon={resource} label={t(`base.resources.${resource}`)}>
          {base.resources[resource]}
        </HudItem>
      ))}
      <HudItem icon="battle" label={t('base.battle.kills')}>
        {t('base.battle.progress', { kills: base.battle.kills, target: base.battle.target })}
      </HudItem>
    </div>
  )
}

export default Hud
