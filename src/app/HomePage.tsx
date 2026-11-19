import { useTranslation } from 'react-i18next'
import AccountForm from './AccountForm'
import AccountPanel from './AccountPanel'
import BaseScreen from './BaseScreen'
import Layout from './Layout'
import { useAccount } from './useAccount'
import { useApiStatus } from './useApiStatus'

/** The home page is the game, which needs the server: it asks the player to sign in or to create an account, then shows their base, and whether the server answers. */
function HomePage() {
  const { t } = useTranslation()
  const apiStatus = useApiStatus()
  const { player, isKnown, submit, signOut } = useAccount()

  return (
    <Layout tools={player === null ? undefined : <AccountPanel player={player} onSignOut={() => void signOut()} />}>
      <section className="game-page" aria-labelledby="game-title">
        <h1 id="game-title" className="game-title">
          {t('game.title')}
        </h1>
        {isKnown && player === null && (
          <>
            <p className="squadron-hint">{t('squadron.signInHint')}</p>
            <AccountForm onSubmit={submit} />
          </>
        )}
        {player !== null && <BaseScreen player={player} />}
        <div className="status-line">
          <span className="status-dot" data-status={apiStatus} aria-hidden="true" />
          <span>{t(`status.${apiStatus}`)}</span>
        </div>
      </section>
    </Layout>
  )
}

export default HomePage
