import { useEffect } from 'react'
import { music } from '../audio/MusicPlayer'
import GamePage from './GamePage'
import HomePage from './HomePage'
import { useHashRoute } from './useHashRoute'

function App() {
  const route = useHashRoute()

  useEffect(() => {
    music.startOnFirstGesture()
  }, [])

  return route === 'game' ? <GamePage /> : <HomePage />
}

export default App
