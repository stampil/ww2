import { useEffect, useState } from 'react'

type Route = 'home' | 'game'

export const HOME_HASH = '#/'
export const GAME_HASH = '#/jeu'

function readRoute(): Route {
  return window.location.hash === GAME_HASH ? 'game' : 'home'
}

/** The page that the address asks for, read after the #, so that a static site needs no rewriting of its addresses. */
export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(readRoute)

  useEffect(() => {
    function updateRoute(): void {
      setRoute(readRoute())
    }
    window.addEventListener('hashchange', updateRoute)
    return () => window.removeEventListener('hashchange', updateRoute)
  }, [])

  return route
}
