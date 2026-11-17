import { useTranslation } from 'react-i18next'
import type { Battle } from './useBase'

type Props = {
  battle: Battle
  onRestart: () => void
}

/** What the end of the battle says, won or lost, and the button that starts a new one. */
function BattleOver({ battle, onRestart }: Props) {
  const { t } = useTranslation()

  return (
    <section className="battle-over" role="alert">
      <h3>{t(`base.battle.${battle.status}.title`)}</h3>
      <p>{t(`base.battle.${battle.status}.text`, { target: battle.target })}</p>
      <button type="button" onClick={onRestart}>
        {t('base.battle.restart')}
      </button>
    </section>
  )
}

export default BattleOver
