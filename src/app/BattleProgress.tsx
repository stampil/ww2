import { useTranslation } from 'react-i18next'
import type { Battle } from './useBase'

/** How many enemy aircraft are shot down against the target of the battle. */
function BattleProgress({ battle }: { battle: Battle }) {
  const { t } = useTranslation()

  return (
    <div className="battle-progress">
      <span>{t('base.battle.kills')}</span>
      <strong>{t('base.battle.progress', { kills: battle.kills, target: battle.target })}</strong>
    </div>
  )
}

export default BattleProgress
