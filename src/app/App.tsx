import { useTranslation } from 'react-i18next'
import AircraftViewer from './AircraftViewer'
import CockpitViewer from './CockpitViewer'
import TakeoffView from './TakeoffView'
import { useApiStatus } from './useApiStatus'

const MODEL_SOURCE_URL = 'https://sourceforge.net/p/flightgear/fgaddon/HEAD/tree/trunk/Aircraft/D520/'
const MODEL_LICENSE_URL = '/models/d520/COPYING'
const MODEL_ATTRIBUTION_URL = '/models/d520/ATTRIBUTION.txt'

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
        <div className="viewers">
          <AircraftViewer />
          <CockpitViewer />
        </div>
        <p className="description">{t('description')}</p>
        <div className="status-line">
          <span className="status-dot" data-status={apiStatus} aria-hidden="true" />
          <span>{t(`status.${apiStatus}`)}</span>
        </div>
      </section>

      <TakeoffView />

      <footer className="footer">
        <div className="footer-text">
          <span>{t('footer')}</span>
          <span className="credits">
            {t('credits.model')} <a href={MODEL_SOURCE_URL}>Emmanuel Baranger</a>, FlightGear,{' '}
            <a href={MODEL_LICENSE_URL}>GPL v2</a>, <a href={MODEL_ATTRIBUTION_URL}>{t('credits.adapted')}</a>.
          </span>
        </div>
        <span className="footer-index">01 — 01</span>
      </footer>
    </main>
  )
}

export default App