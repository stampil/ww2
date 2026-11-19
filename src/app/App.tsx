import { useEffect } from 'react'
import { music } from '../audio/MusicPlayer'
import HomePage from './HomePage'
import PocPage from './PocPage'
import { useHashRoute } from './useHashRoute'

function App() {
  const route = useHashRoute()

  useEffect(() => {
    music.startOnFirstGesture()
  }, [])

  return route === 'poc' ? <PocPage /> : <HomePage />
}

export default App
