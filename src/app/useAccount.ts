import { useEffect, useState } from 'react'

export type Player = { id: number; nickname: string }
export type AccountMode = 'signIn' | 'register'

type SessionPayload = { player: Player | null }
type ErrorPayload = { reason_phrase: string }

const API_DOWN = 'apiDown'
const SESSION_URL = '/api/session'
const ACCOUNT_URL = '/api/account'

async function send(method: string, url: string, body?: object): Promise<{ player: Player | null } | { error: string }> {
  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (response.ok) {
      return (await response.json()) as SessionPayload
    }
    return { error: ((await response.json()) as ErrorPayload).reason_phrase }
  } catch {
    return { error: API_DOWN }
  }
}

/** Who is signed in, found when the page opens, and the ways to sign in, create an account and sign out. */
export function useAccount() {
  const [player, setPlayer] = useState<Player | null>(null)

  useEffect(() => {
    void send('GET', SESSION_URL).then((result) => {
      if ('player' in result) {
        setPlayer(result.player)
      }
    })
  }, [])

  /** Returns the code of the error the API gave, or null when it worked. */
  async function submit(mode: AccountMode, nickname: string, password: string): Promise<string | null> {
    const result = await send('POST', mode === 'register' ? ACCOUNT_URL : SESSION_URL, { nickname, password })
    if ('error' in result) {
      return result.error
    }
    setPlayer(result.player)
    return null
  }

  async function signOut(): Promise<void> {
    const result = await send('DELETE', SESSION_URL)
    if ('player' in result) {
      setPlayer(result.player)
    }
  }

  return { player, submit, signOut }
}
