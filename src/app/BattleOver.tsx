import { useTranslation } from 'react-i18next'
import GameWindow from './GameWindow'
import Icon from './Icon'
import type { Battle } from './useBase'

type Props = {
  battle: Battle
  onRestart: () => void
}

/** What the end of the battle says, won or lost, in a window that stays until a new battle starts. */
function BattleOver({ battle, onRestart }: Props) {
  const { t } = useTranslation()

  return (
    <GameWindow title={t(`base.battle.${battle.status}.title`)}>
      <div className="battle-over">
        <Icon name={battle.status === 'won' ? 'victory' : 'defeat'} />
        <p>{t(`base.battle.${battle.status}.text`, { target: battle.target })}</p>
        <button type="button" className="go" onClick={onRestart}>
          <Icon name="battle" />
          {t('base.battle.restart')}
        </button>
      </div>
    </GameWindow>
  )
}

export default BattleOver
