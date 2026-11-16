import { useState, type FormEvent } from 'react'
import { Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { StatusDot } from '@/components/ui/badge'
import { LanguagePicker } from '@/components/layout/LanguagePicker'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { ApiError } from '@/lib/api'

export function LoginPage() {
  const { bootstrap, login } = useAuth()
  const { t } = useI18n()
  const { preference } = useTheme()
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!password) {
      setError(t('Please enter your password'))
      return
    }
    setBusy(true)
    setError('')
    try {
      await login(password)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t('Could not log in'))
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-bg">
      <header className="flex items-center justify-between px-4 py-3 md:px-6">
        <div className="flex items-center gap-2">
          <PulseMark />
          <span className="text-base font-semibold">Pulse</span>
        </div>
        <div className="flex items-center gap-1">
          <LanguagePicker compact />
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <LockKeyhole className="h-7 w-7" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">{t('Sign in to Pulse')}</h1>
            <p className="mt-1 text-sm text-muted">
              {t('Website change detection, with a calmer interface.')}
            </p>
          </div>

          <form onSubmit={onSubmit} className="pulse-card space-y-4 p-5" noValidate>
            <Field label={t('Password')} htmlFor="password" required>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={visible ? 'text' : 'password'}
                  autoComplete="current-password"
                  autoFocus
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={Boolean(error)}
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setVisible((value) => !value)}
                  className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-input text-muted hover:text-fg"
                  aria-label={visible ? t('Hide password') : t('Show password')}
                >
                  {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            {error ? (
              <p role="alert" className="rounded-input border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger">
                {error}
              </p>
            ) : null}

            <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy}>
              {t('Sign in')}
            </Button>
          </form>

          <div className="mt-5 flex items-center justify-center gap-3 text-xs text-muted">
            <StatusDot tone="success" />
            <span>{t('Your session is protected by the same login as the classic interface.')}</span>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted">
            Pulse {bootstrap.version} · {preference === 'system' ? t('system theme') : t(preference)}
          </p>
        </div>
      </main>
    </div>
  )
}

export function PulseMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <span
      className={`${className} inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[#7c3aed] text-xs font-bold text-white`}
      aria-hidden="true"
    >
      P
    </span>
  )
}
