import { useTranslation } from 'react-i18next'
import AircraftShowcase from './AircraftShowcase'
import AircraftViewer from './AircraftViewer'
import BushViewer from './BushViewer'
import CockpitViewer from './CockpitViewer'
import Layout from './Layout'
import TakeoffView from './TakeoffView'
import TerrainTest from './TerrainTest'
import { HOME_HASH } from './useHashRoute'

const SHOWCASE_AIRCRAFT_IDS = ['ms406', 'bf109', 'ju87', 'he111']

/** The POC, at #/poc: every 3D model of the game (the D.520 and its cockpit, the other aircraft, the bush) turned by dragging, the terrain test and the takeoff. It runs in the browser alone, with no server. */
function PocPage() {
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
        <h2 className="viewers-title">{t('showcase.title')}</h2>
        <div className="viewers viewers-wrapping">
          {SHOWCASE_AIRCRAFT_IDS.map((aircraftId) => (
            <AircraftShowcase key={aircraftId} aircraftId={aircraftId} />
          ))}
          <BushViewer />
        </div>
        <TerrainTest />
        <a className="play-link" href={HOME_HASH}>
          {t('home.play')}
        </a>
      </section>

      <TakeoffView />
    </Layout>
  )
}

export default PocPage
