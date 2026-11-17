import { useTranslation } from 'react-i18next'
import AccountPanel from './AccountPanel'
import BasePanel from './BasePanel'
import Layout from './Layout'
import SquadronPanel from './SquadronPanel'
import { useAccount } from './useAccount'
import { useApiStatus } from './useApiStatus'

/** The game, which needs the server: the account, the squadron and the base of the player, and whether the server answers. */
function GamePage() {
  const { t } = useTranslation()
  const apiStatus = useApiStatus()
  const account = useAccount()

  return (
    <Layout tools={<AccountPanel account={account} />}>
      <section className="intro" aria-labelledby="game-title">
        <h1 id="game-title">{t('game.title')}</h1>
        <SquadronPanel player={account.player} />
        <BasePanel player={account.player} />
        <div className="status-line">
          <span className="status-dot" data-status={apiStatus} aria-hidden="true" />
          <span>{t(`status.${apiStatus}`)}</span>
        </div>
      </section>
    </Layout>
  )
}

export default GamePage
