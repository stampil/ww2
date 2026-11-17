import { useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useAccount } from './useAccount'
import type { AccountMode } from './useAccount'

/** Shows who is signed in with a button to sign out, or a form to sign in or to create an account. */
function AccountPanel() {
  const { t } = useTranslation()
  const { player, submit, signOut } = useAccount()
  const [isOpen, setIsOpen] = useState(false)
  const [errorCode, setErrorCode] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const form = event.currentTarget
    const mode = ((event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement).value as AccountMode
    const fields = new FormData(form)
    const code = await submit(mode, String(fields.get('nickname')), String(fields.get('password')))
    setErrorCode(code)
    if (code === null) {
      form.reset()
      setIsOpen(false)
    }
  }

  if (player !== null) {
    return (
      <div className="account">
        <span className="account-name">{t('account.signedInAs', { nickname: player.nickname })}</span>
        <button type="button" onClick={() => void signOut()}>
          {t('account.signOut')}
        </button>
      </div>
    )
  }

  return (
    <div className="account">
      <button type="button" aria-expanded={isOpen} onClick={() => setIsOpen(!isOpen)}>
        {t('account.signIn')}
      </button>
      {isOpen && (
        <form className="account-form" onSubmit={(event) => void handleSubmit(event)}>
          <label>
            {t('account.nickname')}
            <input name="nickname" autoComplete="username" required />
          </label>
          <label>
            {t('account.password')}
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          {errorCode !== null && (
            <p className="account-error" role="alert">
              {t(`account.errors.${errorCode}`)}
            </p>
          )}
          <div className="account-actions">
            <button type="submit" value="signIn">
              {t('account.signIn')}
            </button>
            <button type="submit" value="register">
              {t('account.register')}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default AccountPanel
