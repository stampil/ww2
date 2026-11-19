import { useTranslation } from 'react-i18next'
import type { Player } from './useAccount'

/** Shows who is signed in, with a button to sign out. */
function AccountPanel({ player, onSignOut }: { player: Player; onSignOut: () => void }) {
  const { t } = useTranslation()

  return (
    <div className="account">
      <span className="account-name">{t('account.signedInAs', { nickname: player.nickname })}</span>
      <button type="button" onClick={onSignOut}>
        {t('account.signOut')}
      </button>
    </div>
  )
}

export default AccountPanel
