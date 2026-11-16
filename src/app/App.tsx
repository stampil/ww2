import { useTranslation } from 'react-i18next'
import TakeoffView from './TakeoffView'
import { useApiStatus } from './useApiStatus'

function App() {
  const { t, i18n } = useTranslation()
  const apiStatus = useApiStatus()

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="French Touch, accueil">
          <span className="wordmark-mark">F</span>
          <span>French Touch</span>
        </a>
        <nav className="language-switch" aria-label={t('language')}>
          <button
            type="button"
            lang="fr"
            aria-pressed={i18n.resolvedLanguage === 'fr'}
            onClick={() => void i18n.changeLanguage('fr')}
          >
            FR
          </button>
          <span aria-hidden="true">/</span>
          <button
            type="button"
            lang="en"
            aria-pressed={i18n.resolvedLanguage === 'en'}
            onClick={() => void i18n.changeLanguage('en')}
          >
            EN
          </button>
        </nav>
      </header>

      <section className="intro" aria-labelledby="welcome-title">
        <p className="eyebrow">{t('eyebrow')}</p>
        <h1 id="welcome-title">{t('title')}</h1>
        <p className="description">{t('description')}</p>
        <div className="status-line">
          <span className="status-dot" data-status={apiStatus} aria-hidden="true" />
          <span>{t(`status.${apiStatus}`)}</span>
        </div>
      </section>

      <TakeoffView />

      <footer className="footer">
        <span>{t('footer')}</span>
        <span className="footer-index">01 — 01</span>
      </footer>
    </main>
  )
}

export default App