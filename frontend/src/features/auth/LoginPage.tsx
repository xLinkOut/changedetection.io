import { useState, type FormEvent } from 'react'
import { Eye, EyeOff, LockKeyhole, ShieldCheck, Waves } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { LanguagePicker } from '@/components/layout/LanguagePicker'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { PulseMark } from '@/components/brand/PulseMark'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'

const SIGNAL_BARS = [18, 30, 44, 26, 52, 38, 22, 48, 32, 56, 28, 40, 20, 50, 34, 26, 46, 30, 54, 38, 22, 44, 28, 36]

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
    <div className="grid min-h-[100dvh] bg-bg lg:grid-cols-[1.05fr_1fr]">
      <aside
        className="relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex"
        style={{ background: 'linear-gradient(165deg, #17122f 0%, #120f26 55%, #0b0918 100%)' }}
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="aurora-blob -left-24 -top-28 h-[420px] w-[420px] bg-[#5347CE]/60 animate-drift" />
          <div className="aurora-blob -right-28 top-1/3 h-[380px] w-[380px] bg-[#4896FE]/35 animate-drift [animation-delay:-6s]" />
          <div className="aurora-blob bottom-[-8rem] left-1/4 h-[340px] w-[440px] bg-[#16C8C7]/25 animate-drift [animation-delay:-11s]" />
        </div>
        <div className="pulse-grain pointer-events-none absolute inset-0" aria-hidden="true" />

        <div className="relative flex items-center gap-3">
          <PulseMark className="h-10 w-10" animated glow />
          <div>
            <p className="font-display text-lg font-semibold tracking-[-0.02em]">Pulse</p>
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/60">
              changedetection.io
            </p>
          </div>
        </div>

        <div className="relative max-w-lg">
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/60">
            <Waves className="h-3.5 w-3.5" aria-hidden="true" />
            {t('Signal, not noise')}
          </p>
          <h1 className="mt-4 font-display text-[56px] font-semibold leading-[0.98] tracking-[-0.045em] xl:text-[64px]">
            {t('Watch the web.')}
            <br />
            <span className="signal-gradient-text">{t('Feel the change.')}</span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/55">
            {t(
              'A live, self-hosted lens on every page you care about. Changes arrive as they happen, without the dashboard noise.',
            )}
          </p>

          <div className="mt-10 flex items-end gap-2">
            <div className="equalizer !h-20 flex-1" aria-hidden="true">
              {SIGNAL_BARS.map((height, index) => (
                <span
                  key={index}
                  className="!w-[5px] flex-1"
                  style={{
                    height: `${height + 24}px`,
                    animationDelay: `${(index % 8) * 0.1}s`,
                    animationDuration: `${1.15 + (index % 5) * 0.17}s`,
                  }}
                />
              ))}
            </div>
            <div className="ml-2 shrink-0 text-right">
              <p className="text-[9px] uppercase tracking-[0.2em] text-white/60">{t('Stream')}</p>
              <p className="font-display text-sm font-semibold text-white/80">SSE</p>
              <p className="mt-2 text-[9px] uppercase tracking-[0.2em] text-white/60">{t('State')}</p>
              <p className="inline-flex items-center gap-1.5 font-display text-sm font-semibold text-[#16C8C7]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#16C8C7]" />
                Live
              </p>
            </div>
          </div>
        </div>

        <div className="relative flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-white/60">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {t('Session-protected')}
          </span>
          <span>{t('Self-hosted')}</span>
          <span>{t('Mobile-first')}</span>
          <span>{t('Open source')}</span>
        </div>
      </aside>

      <main className="relative flex min-h-[100dvh] flex-col overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="aurora-blob -right-24 -top-24 h-72 w-72 bg-violet/20" />
          <div className="aurora-blob -bottom-24 -left-20 h-64 w-64 bg-teal/10" />
        </div>
        <header className="flex items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-2 lg:invisible">
            <PulseMark className="h-8 w-8" animated />
            <span className="font-display text-base font-semibold">Pulse</span>
          </div>
          <div className="flex items-center gap-1">
            <LanguagePicker compact />
            <ThemeToggle />
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center px-4 pb-20">
          <div className="w-full max-w-[380px]">
            <div className="mb-7">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-violet/25 bg-violet/10 text-primary">
                <LockKeyhole className="h-6 w-6" aria-hidden="true" />
              </div>
              <h2 className="font-display text-[30px] font-semibold leading-tight tracking-[-0.03em]">
                {t('Welcome back')}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {t('Sign in to watch the pages that matter.')}
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4" noValidate>
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
                    className={cn('h-12 pr-12', error && 'border-danger focus-visible:border-danger focus-visible:outline-danger/50')}
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

            <p className="mt-5 text-center text-[11px] leading-5 text-muted">
              {t('One session for Pulse and the classic interface.')}
            </p>
            <p className="mt-1 text-center text-[10px] text-muted/70">
              Pulse {bootstrap.version} ·{' '}
              {preference === 'system'
                ? t('system theme')
                : t(preference.charAt(0).toUpperCase() + preference.slice(1))}
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
