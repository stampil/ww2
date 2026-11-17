import GamePage from './GamePage'
import HomePage from './HomePage'
import { useHashRoute } from './useHashRoute'

function App() {
  const route = useHashRoute()

  return route === 'game' ? <GamePage /> : <HomePage />
}

export default App
