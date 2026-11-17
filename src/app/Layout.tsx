import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { assetUrl } from '../assetUrl'
import { HOME_HASH } from './useHashRoute'

const MODEL_SOURCE_URL = 'https://sourceforge.net/p/flightgear/fgaddon/HEAD/tree/trunk/Aircraft/D520/'
const MODEL_LICENSE_URL = assetUrl('models/d520/COPYING')
const MODEL_ATTRIBUTION_URL = assetUrl('models/d520/ATTRIBUTION.txt')

/** What every page shares: the top bar, with the tools of the page and the language switch, and the footer with the credits. */
function Layout({ tools, children }: { tools?: ReactNode; children: ReactNode }) {
  const { t, i18n } = useTranslation()

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="wordmark" href={HOME_HASH} aria-label="French Touch, accueil">
          <span className="wordmark-mark">F</span>
          <span>French Touch</span>
        </a>
        <div className="topbar-tools">
          {tools}
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
        </div>
      </header>

      {children}

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

export default Layout
