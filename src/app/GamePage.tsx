import { useTranslation } from 'react-i18next'
import AccountPanel from './AccountPanel'
import BaseScreen from './BaseScreen'
import Layout from './Layout'
import { useAccount } from './useAccount'
import { useApiStatus } from './useApiStatus'

/** The game, which needs the server: the base of the player who is signed in, and whether the server answers. */
function GamePage() {
  const { t } = useTranslation()
  const apiStatus = useApiStatus()
  const account = useAccount()

  return (
    <Layout tools={<AccountPanel account={account} />}>
      <section className="intro" aria-labelledby="game-title">
        <h1 id="game-title">{t('game.title')}</h1>
        {account.player === null ? <p className="squadron-hint">{t('squadron.signInHint')}</p> : <BaseScreen player={account.player} />}
        <div className="status-line">
          <span className="status-dot" data-status={apiStatus} aria-hidden="true" />
          <span>{t(`status.${apiStatus}`)}</span>
        </div>
      </section>
    </Layout>
  )
}

export default GamePage
