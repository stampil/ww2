import { useTranslation } from 'react-i18next'
import AircraftViewer from './AircraftViewer'
import CockpitViewer from './CockpitViewer'
import Layout from './Layout'
import TakeoffView from './TakeoffView'
import TerrainTest from './TerrainTest'
import { GAME_HASH } from './useHashRoute'

/** The showcase: the D.520 and its cockpit in 3D, the terrain test and the takeoff. It runs in the browser alone, with no server. */
function HomePage() {
  const { t } = useTranslation()

  return (
    <Layout>
      <section className="intro" aria-labelledby="welcome-title">
        <p className="eyebrow">{t('eyebrow')}</p>
        <h1 id="welcome-title">{t('title')}</h1>
        <div className="viewers">
          <AircraftViewer />
          <CockpitViewer />
        </div>
        <TerrainTest />
        <p className="description">{t('description')}</p>
        <a className="play-link" href={GAME_HASH}>
          {t('home.play')}
        </a>
      </section>

      <TakeoffView />
    </Layout>
  )
}

export default HomePage
