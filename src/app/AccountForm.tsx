import { useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { AccountMode } from './useAccount'

type Props = {
  /** Signs in or creates the account; returns the code of the error the API gave, or null when it worked. */
  onSubmit: (mode: AccountMode, nickname: string, password: string) => Promise<string | null>
}

/** The form that asks for a nickname and a password, to sign in or to create an account. */
function AccountForm({ onSubmit }: Props) {
  const { t } = useTranslation()
  const [errorCode, setErrorCode] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const mode = ((event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement).value as AccountMode
    const fields = new FormData(event.currentTarget)
    setErrorCode(await onSubmit(mode, String(fields.get('nickname')), String(fields.get('password'))))
  }

  return (
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
  )
}

export default AccountForm
