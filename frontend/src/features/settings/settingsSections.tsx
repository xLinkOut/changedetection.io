import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Archive,
  Bell,
  Check,
  Clipboard,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  Languages,
  Monitor,
  Moon,
  Plus,
  RefreshCw,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import { useToast } from '@/components/ui/toast'
import { useBackups, type Backup } from '@/lib/queries'
import { useTheme } from '@/lib/theme'
import type { Settings } from '@/lib/types'
import { formatBytes, formatDateTime, formatDuration } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { ConfirmDialog } from '@/components/ui/confirm'
import { LegacyLink } from '@/components/legacy/LegacyLink'
import { ScheduleEditor } from '@/features/watch-edit/sections'
import { normaliseSchedule, scheduleToBackend, type ScheduleState } from '@/features/watch-edit/formState'
import { EmptyState, Skeleton } from '@/components/ui/states'
import { cn } from '@/lib/cn'

export type SettingsSection =
  | 'general'
  | 'fetching'
  | 'filters'
  | 'ui'
  | 'api'
  | 'notifications'
  | 'llm'
  | 'rss'
  | 'proxies'

function TextField({
  label,
  value,
  onChange,
  help,
  type = 'text',
  placeholder,
  id,
}: {
  label: string
  value: string | number | null
  onChange: (value: string) => void
  help?: string
  type?: string
  placeholder?: string
  id: string
}) {
  return (
    <Field label={label} htmlFor={id} help={help}>
      <Input
        id={id}
        type={type}
        value={value === null || value === undefined ? '' : String(value)}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </Field>
  )
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  help,
  id,
  allowEmpty = true,
}: {
  label: string
  value: number | null
  onChange: (value: number | null) => void
  min?: number
  max?: number
  help?: string
  id: string
  allowEmpty?: boolean
}) {
  return (
    <Field label={label} htmlFor={id} help={help}>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        value={value === null || value === undefined ? '' : value}
        onChange={(event) => {
          const raw = event.target.value
          if (raw === '' && allowEmpty) onChange(null)
          else onChange(Number(raw))
        }}
      />
    </Field>
  )
}

export function GeneralSettings({
  value,
  onChange,
  timezones,
  passwordLocked,
  proxies,
}: {
  value: Settings['general']
  onChange: (value: Settings['general']) => void
  timezones: string[]
  passwordLocked: boolean
  proxies: string[]
}) {
  const { t } = useI18n()
  const { toast } = useToast()
  const client = useQueryClient()
  const { bootstrap, refresh } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)

  const interval = value.time_between_check as Record<string, number | null>
  const schedule = normaliseSchedule(value.time_schedule_limit)

  const passwordMutation = useMutation({
    mutationFn: (body: { password?: string; remove?: boolean }) =>
      apiFetch('/settings/password', { method: 'POST', body }),
    onSuccess: async (_data, variables) => {
      toast(variables.remove ? t('Password protection removed') : t('Password updated. Please log in again.'), {
        tone: 'success',
      })
      setPassword('')
      setConfirm('')
      setRemoveOpen(false)
      await refresh()
      client.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: (error) => toast(error.message, { tone: 'error' }),
  })

  function savePassword() {
    if (!password) {
      toast(t('Enter a password'), { tone: 'error' })
      return
    }
    if (password !== confirm) {
      toast(t('The passwords do not match'), { tone: 'error' })
      return
    }
    passwordMutation.mutate({ password })
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="mb-2 text-sm font-semibold">{t('Default check interval')}</h2>
        <div className="grid grid-cols-5 gap-1.5">
          {(['weeks', 'days', 'hours', 'minutes', 'seconds'] as const).map((part) => (
            <label key={part} className="block">
              <span className="mb-1 block text-[11px] capitalize text-muted">
                {t(part.charAt(0).toUpperCase() + part.slice(1))}
              </span>
              <Input
                type="number"
                min={0}
                value={interval[part] ?? ''}
                onChange={(event) =>
                  onChange({
                    ...value,
                    time_between_check: {
                      ...interval,
                      [part]: event.target.value === '' ? null : Number(event.target.value),
                    },
                  })
                }
                className="px-1 text-center"
              />
            </label>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold">{t('Default schedule')}</h2>
        <ScheduleEditor
          value={schedule}
          timezones={timezones}
          onChange={(next: ScheduleState) =>
            onChange({ ...value, time_schedule_limit: scheduleToBackend(next) })
          }
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField
          id="settings-history"
          label={t('Snapshots to keep per watch')}
          value={value.history_snapshot_max_length}
          onChange={(next) => onChange({ ...value, history_snapshot_max_length: next })}
          min={2}
          help={t('Leave empty for no limit.')}
        />
        <NumberField
          id="settings-filter-failures"
          label={t('Filter failures before notifying')}
          value={value.filter_failure_notification_threshold_attempts}
          onChange={(next) => onChange({ ...value, filter_failure_notification_threshold_attempts: next ?? 0 })}
          min={0}
        />
        <Field label={t('Default timezone')} htmlFor="settings-timezone">
          <Input
            id="settings-timezone"
            list="settings-timezones"
            value={value.scheduler_timezone_default || ''}
            onChange={(event) => onChange({ ...value, scheduler_timezone_default: event.target.value || null })}
            placeholder={t('System timezone')}
          />
          <datalist id="settings-timezones">
            {timezones.map((timezone) => (
              <option key={timezone} value={timezone} />
            ))}
          </datalist>
        </Field>
        <Field
          label={t('Default proxy')}
          htmlFor="settings-proxy"
          help={proxies.length ? undefined : t('Add proxies in Settings → Proxies first.')}
        >
          <Select
            id="settings-proxy"
            value={value.default_proxy || ''}
            onChange={(event) => onChange({ ...value, default_proxy: event.target.value || null })}
          >
            <option value="">{t('No proxy')}</option>
            {proxies.map((proxy) => (
              <option key={proxy} value={proxy}>
                {proxy}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-1 sm:grid-cols-2">
        <Checkbox
          label={t('Allow anonymous access to watch history')}
          description={t('Only for shared-diff links while a password is enabled.')}
          checked={value.shared_diff_access}
          onChange={(event) => onChange({ ...value, shared_diff_access: event.target.checked })}
        />
        <Checkbox
          label={t('Treat empty pages as a change')}
          checked={value.empty_pages_are_a_change}
          onChange={(event) => onChange({ ...value, empty_pages_are_a_change: event.target.checked })}
        />
      </div>

      <div className="rounded-input border border-border p-3">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <KeyRound className="h-4 w-4" /> {t('Password protection')}
        </h2>
        {passwordLocked ? (
          <p className="mt-1 text-xs text-muted">
            {t('The password is locked by the SALTED_PASS environment variable.')}
          </p>
        ) : (
          <>
            <p className="mt-1 text-xs text-muted">
              {value.password_set ? t('A password is set. Enter a new one to replace it.') : t('No password is set. Anyone who can reach this instance can use it.')}
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <Field label={value.password_set ? t('New password') : t('Password')} htmlFor="settings-password">
                <div className="relative">
                  <Input
                    id="settings-password"
                    type={show ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((current) => !current)}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted"
                    aria-label={show ? t('Hide password') : t('Show password')}
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
              <Field label={t('Confirm password')} htmlFor="settings-password-confirm">
                <Input
                  id="settings-password-confirm"
                  type={show ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                />
              </Field>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={savePassword} loading={passwordMutation.isPending && !passwordMutation.variables?.remove}>
                {t('Set password')}
              </Button>
              {value.password_set ? (
                <Button variant="ghost" className="text-danger" onClick={() => setRemoveOpen(true)}>
                  {t('Remove password')}
                </Button>
              ) : null}
            </div>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <LegacyLink href="/clear_history">{t('Clear all snapshot history')}</LegacyLink>
        <span className="text-xs text-muted">{t('This is a destructive legacy screen.')}</span>
      </div>

      <div className="rounded-input border border-border bg-surface-2 p-3 text-xs text-muted">
        {t('Current global state')}: {bootstrap.settings?.allPaused ? t('checks paused') : t('checks running')},{' '}
        {bootstrap.settings?.allMuted ? t('notifications muted') : t('notifications on')}.
      </div>

      <ConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title={t('Remove password protection?')}
        description={t('Anyone who can reach this instance will be able to open it.')}
        confirmLabel={t('Remove password')}
        destructive
        busy={passwordMutation.isPending}
        onConfirm={() => passwordMutation.mutate({ remove: true })}
      />
    </div>
  )
}

export function FetchingSettings({
  value,
  onChange,
}: {
  value: Settings['fetching']
  onChange: (value: Settings['fetching']) => void
}) {
  const { bootstrap } = useAuth()
  const { t } = useI18n()
  const ua = value.default_ua || {}

  return (
    <div className="space-y-4">
      <Field label={t('Default fetch method')} htmlFor="settings-fetcher">
        <Select id="settings-fetcher" value={value.fetch_backend || ''} onChange={(event) => onChange({ ...value, fetch_backend: event.target.value })}>
          {(bootstrap.fetchers || [])
            .filter((fetcher) => fetcher.value !== 'system')
            .map((fetcher) => (
              <option key={fetcher.value} value={fetcher.value}>{fetcher.label}</option>
            ))}
        </Select>
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField id="settings-workers" label={t('Fetch workers')} value={value.workers} onChange={(next) => onChange({ ...value, workers: next ?? 1 })} min={1} max={50} />
        <NumberField id="settings-timeout" label={t('Request timeout (seconds)')} value={value.timeout} onChange={(next) => onChange({ ...value, timeout: next ?? 45 })} min={1} max={999} />
        <NumberField id="settings-jitter" label={t('Random jitter (seconds)')} value={value.jitter_seconds} onChange={(next) => onChange({ ...value, jitter_seconds: next ?? 0 })} min={0} />
        <NumberField id="settings-webdriver" label={t('Browser wait before extraction (seconds)')} value={value.webdriver_delay} onChange={(next) => onChange({ ...value, webdriver_delay: next })} min={1} />
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold">{t('Default User-Agent overrides')}</h2>
        <TextField id="settings-ua-requests" label={t('Plaintext requests')} value={ua.html_requests || ''} onChange={(next) => onChange({ ...value, default_ua: { ...ua, html_requests: next || null } })} placeholder="<default>" />
        <TextField id="settings-ua-webdriver" label={t('Chrome requests')} value={ua.html_webdriver || ''} onChange={(next) => onChange({ ...value, default_ua: { ...ua, html_webdriver: next || null } })} placeholder="<default>" />
      </div>

      <p className="text-xs text-muted">{t('A minimum of {seconds} seconds between checks is enforced.').replace('{seconds}', String(value.min_recheck_seconds))}</p>
    </div>
  )
}

export function FiltersSettings({
  value,
  onChange,
}: {
  value: Settings['filters']
  onChange: (value: Settings['filters']) => void
}) {
  const { t } = useI18n()
  return (
    <div className="space-y-4">
      <div className="grid gap-1">
        <Checkbox label={t('Ignore whitespace')} checked={value.ignore_whitespace} onChange={(event) => onChange({ ...value, ignore_whitespace: event.target.checked })} />
        <Checkbox label={t('Render anchor tag content')} checked={value.render_anchor_tag_content} onChange={(event) => onChange({ ...value, render_anchor_tag_content: event.target.checked })} />
        <Checkbox label={t('Strip ignored lines')} checked={value.strip_ignored_lines} onChange={(event) => onChange({ ...value, strip_ignored_lines: event.target.checked })} />
      </div>
      <Field label={t('Global remove elements')} htmlFor="global-subtractive" help={t('CSS or XPath selectors, one per line.')}>
        <Textarea id="global-subtractive" rows={5} value={value.global_subtractive_selectors.join('\n')} onChange={(event) => onChange({ ...value, global_subtractive_selectors: event.target.value.split('\n').map((line) => line.trim()).filter(Boolean) })} />
      </Field>
      <Field label={t('Global ignore text')} htmlFor="global-ignore" help={t('Lines containing these values are ignored on every watch.')}>
        <Textarea id="global-ignore" rows={5} value={value.global_ignore_text.join('\n')} onChange={(event) => onChange({ ...value, global_ignore_text: event.target.value.split('\n').map((line) => line.trim()).filter(Boolean) })} />
      </Field>
    </div>
  )
}

function AppearanceSettings() {
  const { t, locale, languages, setLocale } = useI18n()
  const { preference, setPreference } = useTheme()
  const { refresh } = useAuth()
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)

  const themes = [
    { value: 'light', label: t('Light'), icon: Sun },
    { value: 'dark', label: t('Dark'), icon: Moon },
    { value: 'system', label: t('System'), icon: Monitor },
  ] as const

  return (
    <div className="space-y-4 rounded-input border border-border bg-surface-2/40 p-3.5">
      <div>
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <Sun className="h-4 w-4" aria-hidden="true" /> {t('Appearance')}
        </h2>
        <p className="mt-0.5 text-xs text-muted">
          {t('Saved in this browser. It does not change the classic interface.')}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {themes.map((theme) => {
          const Icon = theme.icon
          const active = preference === theme.value
          return (
            <button
              key={theme.value}
              type="button"
              onClick={() => setPreference(theme.value)}
              aria-pressed={active}
              className={cn(
                'flex min-h-11 items-center justify-center gap-1.5 rounded-input border text-sm font-medium transition',
                active
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border bg-surface text-muted hover:text-fg',
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" /> {theme.label}
            </button>
          )
        })}
      </div>

      <Field label={t('Language')} htmlFor="settings-language">
        <div className="relative">
          <Languages
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <Select
            id="settings-language"
            value={locale}
            disabled={busy}
            onChange={async (event) => {
              setBusy(true)
              try {
                await setLocale(event.target.value)
                await refresh()
              } catch {
                toast(t('Could not change language'), { tone: 'error' })
              } finally {
                setBusy(false)
              }
            }}
            className="pl-9"
          >
            {languages.map((language) => (
              <option key={language.code} value={language.code}>
                {language.name}
              </option>
            ))}
          </Select>
        </div>
      </Field>
    </div>
  )
}

export function UiSettings({
  value,
  onChange,
}: {
  value: Settings['ui']
  onChange: (value: Settings['ui']) => void
}) {
  const { t } = useI18n()
  return (
    <div className="space-y-4">
      <AppearanceSettings />
      <div className="grid gap-1">
        <Switch label={t('Realtime UI updates')} description={t('Pulse uses one SSE stream. Turning this off disables live updates in Pulse and Socket.IO in the classic UI.')} checked={value.realtime_updates} onCheckedChange={(checked) => onChange({ ...value, realtime_updates: checked })} />
        <Switch label={t('Favicons')} checked={value.favicons_enabled} onCheckedChange={(checked) => onChange({ ...value, favicons_enabled: checked })} />
        <Switch label={t('Open diff in a new tab')} checked={value.open_diff_in_new_tab} onCheckedChange={(checked) => onChange({ ...value, open_diff_in_new_tab: checked })} />
        <Switch label={t('Use page title in the watch list')} checked={value.use_page_title_in_list} onCheckedChange={(checked) => onChange({ ...value, use_page_title_in_list: checked })} />
        <Switch label={t('Enable watch sharing')} checked={value.use_share_watch} onCheckedChange={(checked) => onChange({ ...value, use_share_watch: checked })} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField id="settings-pager" label={t('Pager size')} value={value.pager_size} onChange={(next) => onChange({ ...value, pager_size: next ?? 50 })} min={0} help={t('0 disables pagination.')} />
        <Field label={t('Relative time format')} htmlFor="settings-timeago">
          <Select id="settings-timeago" value={value.timeago_format} onChange={(event) => onChange({ ...value, timeago_format: event.target.value as 'long' | 'short' })}>
            <option value="long">{t('Long (1 minute ago)')}</option>
            <option value="short">{t('Short (1m ago)')}</option>
          </Select>
        </Field>
        <Field label={t('Classic sidebar mode')} htmlFor="settings-sidebar">
          <Select id="settings-sidebar" value={value.sidebar_mode} onChange={(event) => onChange({ ...value, sidebar_mode: event.target.value })}>
            {value.sidebar_modes.map((mode) => (
              <option key={mode.value} value={mode.value}>{t(mode.label)}</option>
            ))}
          </Select>
        </Field>
      </div>
    </div>
  )
}

export function ApiSettings({ value }: { value: Settings['api'] }) {
  const { t } = useI18n()
  const { toast } = useToast()
  const client = useQueryClient()
  const [resetOpen, setResetOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [key, setKey] = useState(value.api_key)
  const [enabled, setEnabled] = useState(value.api_access_token_enabled)

  const update = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch('/settings', { method: 'PUT', body }),
    onSuccess: () => {
      toast(t('API settings saved'), { tone: 'success' })
      client.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: (error) => toast(error.message, { tone: 'error' }),
  })

  const reset = useMutation({
    mutationFn: () => apiFetch<{ api_key: string }>('/settings/api-key/reset', { method: 'POST' }),
    onSuccess: (data) => {
      setKey(data.api_key)
      setResetOpen(false)
      toast(t('API key regenerated'), { tone: 'success' })
      client.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: (error) => toast(error.message, { tone: 'error' }),
  })

  return (
    <div className="space-y-4">
      <Switch
        label={t('Require the API key for /api/v1')}
        description={t('Pulse itself never uses this key. It is only for external clients.')}
        checked={enabled}
        onCheckedChange={(checked) => {
          setEnabled(checked)
          update.mutate({ api: { api_access_token_enabled: checked } })
        }}
      />

      <Field label={t('API key')} htmlFor="settings-api-key" help={t('Use this with the x-api-key header on /api/v1.')}>
        <div className="flex gap-2">
          <Input id="settings-api-key" readOnly value={key} className="font-mono" />
          <Button
            variant="secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(key)
                setCopied(true)
                window.setTimeout(() => setCopied(false), 1500)
              } catch {
                toast(t('Could not copy'), { tone: 'error' })
              }
            }}
          >
            {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
            {copied ? t('Copied') : t('Copy')}
          </Button>
        </div>
      </Field>

      <Button variant="secondary" onClick={() => setResetOpen(true)}>
        <RefreshCw className="h-4 w-4" /> {t('Regenerate key')}
      </Button>

      <p className="text-xs text-muted">
        {t('Chrome extension and other integrations use this key. Pulse uses your login session instead.')}
      </p>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title={t('Regenerate the API key?')}
        description={t('Every external client using the old key stops working until it is updated.')}
        confirmLabel={t('Regenerate key')}
        destructive
        busy={reset.isPending}
        onConfirm={() => reset.mutate()}
      />
    </div>
  )
}

export function NotificationsSettings({
  value,
  onChange,
}: {
  value: Settings['notifications']
  onChange: (value: Settings['notifications']) => void
}) {
  const { t } = useI18n()
  const { toast } = useToast()
  const test = useMutation({
    mutationFn: () =>
      apiFetch('/notifications/test', {
        method: 'POST',
        body: {
          urls: value.notification_urls,
          title: value.notification_title || undefined,
          body: value.notification_body || undefined,
        },
      }),
    onSuccess: () => toast(t('Test notification sent'), { tone: 'success' }),
    onError: (error) => toast(error.message, { tone: 'error' }),
  })

  return (
    <div className="space-y-4">
      <Field label={t('Notification URLs')} htmlFor="settings-notify-urls" help={t('One Apprise URL per line.')}>
        <Textarea id="settings-notify-urls" rows={5} value={value.notification_urls.join('\n')} onChange={(event) => onChange({ ...value, notification_urls: event.target.value.split('\n').map((line) => line.trim()).filter(Boolean) })} className="font-mono" />
      </Field>
      <Field label={t('Notification format')} htmlFor="settings-notify-format">
        <Select id="settings-notify-format" value={value.notification_format} onChange={(event) => onChange({ ...value, notification_format: event.target.value })}>
          {value.formats.filter((format) => format.value !== 'System default').map((format) => (
            <option key={format.value} value={format.value}>{format.label}</option>
          ))}
        </Select>
      </Field>
      <Field label={t('Notification title')} htmlFor="settings-notify-title">
        <Input id="settings-notify-title" value={value.notification_title || ''} onChange={(event) => onChange({ ...value, notification_title: event.target.value })} />
      </Field>
      <Field label={t('Notification body')} htmlFor="settings-notify-body">
        <Textarea id="settings-notify-body" rows={6} value={value.notification_body || ''} onChange={(event) => onChange({ ...value, notification_body: event.target.value })} className="font-mono" />
      </Field>
      <Field label={t('Notification base URL override')} htmlFor="settings-base-url">
        <Input id="settings-base-url" value={value.base_url || ''} onChange={(event) => onChange({ ...value, base_url: event.target.value })} placeholder={t('Use the configured base URL')} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => test.mutate()} loading={test.isPending}>
          <Bell className="h-4 w-4" /> {t('Send test notification')}
        </Button>
        <LegacyLink href="/settings/notification-logs">{t('Notification logs')}</LegacyLink>
        <LegacyLink href="/settings/notifications/apprise">{t('Apprise URL builder')}</LegacyLink>
      </div>
    </div>
  )
}

function llmString(value: Record<string, unknown>, key: string, fallback = ''): string {
  const item = value[key]
  return item === null || item === undefined ? fallback : String(item)
}

function llmBool(value: Record<string, unknown>, key: string, fallback = false): boolean {
  return value[key] === undefined ? fallback : Boolean(value[key])
}

function llmNumber(value: Record<string, unknown>, key: string, fallback: number | null = null): number | null {
  const item = value[key]
  return typeof item === 'number' ? item : fallback
}

export function AiSettings({
  value,
  onChange,
}: {
  value: Settings['llm']
  onChange: (value: Settings['llm']) => void
}) {
  const { t } = useI18n()
  const { bootstrap } = useAuth()
  const [apiKey, setApiKey] = useState('')
  const [clearKey, setClearKey] = useState(false)
  const record = value as unknown as Record<string, unknown>

  function patch(key: string, next: unknown) {
    onChange({ ...(value as unknown as Record<string, unknown>), [key]: next } as Settings['llm'])
  }

  if (bootstrap.features?.llmFeaturesDisabled) {
    return <p className="text-sm text-muted">{t('AI features are disabled by the environment.')}</p>
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-1">
        <Switch label={t('AI enabled')} checked={llmBool(record, 'enabled', true)} onCheckedChange={(checked) => patch('enabled', checked)} />
        <Switch label={t('Use AI summary instead of raw diff in notifications')} checked={llmBool(record, 'override_diff_with_summary', true)} onCheckedChange={(checked) => patch('override_diff_with_summary', checked)} />
        <Switch label={t('Debug AI requests')} checked={llmBool(record, 'debug')} onCheckedChange={(checked) => patch('debug', checked)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <TextField id="llm-model" label={t('Model')} value={llmString(record, 'model')} onChange={(next) => patch('model', next)} placeholder="gpt-4o-mini" />
        <TextField id="llm-provider" label={t('Provider kind')} value={llmString(record, 'provider_kind')} onChange={(next) => patch('provider_kind', next)} placeholder="openai, anthropic, ollama…" />
        <TextField id="llm-base" label={t('API base URL')} value={llmString(record, 'api_base')} onChange={(next) => patch('api_base', next)} placeholder="https://api.openai.com/v1" />
        <Field label={t('API key')} htmlFor="llm-key" help={value.api_key_set ? t('A key is stored. Leave empty to keep it.') : t('No key stored.')}>
          <Input
            id="llm-key"
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(event) => {
              setApiKey(event.target.value)
              setClearKey(false)
              patch('api_key', event.target.value)
            }}
            placeholder={value.api_key_set ? '••••••••' : ''}
          />
          {value.api_key_set ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-1 h-7 px-2 text-danger"
              onClick={() => {
                setApiKey('')
                setClearKey(true)
                patch('api_key', '')
                patch('api_key_clear', true)
              }}
            >
              {clearKey ? t('Key will be cleared on save') : t('Clear stored key')}
            </Button>
          ) : null}
        </Field>
      </div>

      <Field label={t('Default change summary prompt')} htmlFor="llm-prompt">
        <Textarea id="llm-prompt" rows={8} value={llmString(record, 'change_summary_default')} onChange={(event) => patch('change_summary_default', event.target.value)} />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField id="llm-max-summary" label={t('Max summary tokens')} value={llmNumber(record, 'max_summary_tokens', 3000)} onChange={(next) => patch('max_summary_tokens', next ?? 3000)} min={1} />
        <NumberField id="llm-budget" label={t('Monthly token budget')} value={llmNumber(record, 'token_budget_month', 0)} onChange={(next) => patch('token_budget_month', next ?? 0)} min={0} help={t('0 means unlimited.')} />
        <NumberField id="llm-max-input" label={t('Max input characters')} value={llmNumber(record, 'max_input_chars', 100000)} onChange={(next) => patch('max_input_chars', next ?? 100000)} min={1} />
        <NumberField id="llm-per-watch" label={t('Per-watch tokens per period')} value={llmNumber(record, 'max_tokens_per_count_period', 0)} onChange={(next) => patch('max_tokens_per_count_period', next ?? 0)} min={0} help={t('0 means unlimited.')} />
        <NumberField id="llm-multiplier" label={t('Local reasoning token multiplier')} value={llmNumber(record, 'local_token_multiplier', 5)} onChange={(next) => patch('local_token_multiplier', next ?? 5)} min={1} max={20} />
        <NumberField id="llm-thinking" label={t('Thinking budget')} value={llmNumber(record, 'thinking_budget', 0)} onChange={(next) => patch('thinking_budget', next ?? 0)} min={0} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('When the monthly budget is reached')} htmlFor="llm-budget-action">
          <Select id="llm-budget-action" value={llmString(record, 'budget_action', 'skip_llm')} onChange={(event) => patch('budget_action', event.target.value)}>
            <option value="skip_llm">{t('Skip AI summarisation only')}</option>
            <option value="skip_check">{t('Skip the watch check entirely')}</option>
          </Select>
        </Field>
        <Field label={t('Watchlist summary compares')} htmlFor="llm-baseline">
          <Select id="llm-baseline" value={llmString(record, 'watchlist_overview_summary', 'second_last_version')} onChange={(event) => patch('watchlist_overview_summary', event.target.value)}>
            <option value="second_last_version">{t('Previous version')}</option>
            <option value="since_last_viewed">{t('Since you last viewed')}</option>
          </Select>
        </Field>
      </div>

      <div className="grid gap-1">
        <Switch label={t('Switch thinking off for local models')} checked={llmBool(record, 'local_thinking_off')} onCheckedChange={(checked) => patch('local_thinking_off', checked)} />
        <Switch label={t('Use fallback extraction for restock')} checked={llmBool(record, 'restock_use_fallback_extract', true)} onCheckedChange={(checked) => patch('restock_use_fallback_extract', checked)} />
      </div>

      <div className="rounded-input border border-border bg-surface-2 p-3 text-xs text-muted">
        <p>{t('Tokens this month')}: <strong className="text-fg">{String(record.tokens_this_month ?? 0)}</strong></p>
        <p>{t('Cost this month')}: <strong className="text-fg">${String(record.cost_usd_this_month ?? 0)}</strong></p>
        <p>{t('Total tokens')}: <strong className="text-fg">{String(record.tokens_total_cumulative ?? 0)}</strong></p>
        <p className="mt-1">{t('AI provider/model/key are also set with LLM_MODEL, LLM_API_KEY and LLM_API_BASE environment variables, which take precedence.')}</p>
      </div>

      <LegacyLink href="/settings/ai/llm">{t('Open the full AI settings page')}</LegacyLink>
    </div>
  )
}

export function RssSettings({
  value,
  onChange,
}: {
  value: Settings['rss']
  onChange: (value: Settings['rss']) => void
}) {
  const { t } = useI18n()
  return (
    <div className="space-y-4">
      <div className="grid gap-1">
        <Switch label={t('Hide muted watches from the feed')} checked={value.rss_hide_muted_watches} onCheckedChange={(checked) => onChange({ ...value, rss_hide_muted_watches: checked })} />
        <Switch label={t('RSS reader mode')} checked={value.rss_reader_mode} onCheckedChange={(checked) => onChange({ ...value, rss_reader_mode: checked })} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField id="rss-diff-length" label={t('Changes shown in the watch feed')} value={value.rss_diff_length} onChange={(next) => onChange({ ...value, rss_diff_length: next ?? 5 })} min={0} />
        <Field label={t('Content format')} htmlFor="rss-format">
          <Select id="rss-format" value={value.rss_content_format} onChange={(event) => onChange({ ...value, rss_content_format: event.target.value })}>
            {value.content_formats.map((format) => (
              <option key={format.value} value={format.value}>{format.label}</option>
            ))}
          </Select>
        </Field>
        <Field label={t('Description built from')} htmlFor="rss-template-type">
          <Select id="rss-template-type" value={value.rss_template_type} onChange={(event) => onChange({ ...value, rss_template_type: event.target.value })}>
            {value.template_types.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label={t('System default template override')} htmlFor="rss-template">
        <Textarea id="rss-template" rows={6} value={value.rss_template_override || ''} onChange={(event) => onChange({ ...value, rss_template_override: event.target.value })} className="font-mono" />
      </Field>
      <LegacyLink href="/settings#rss">{t('Open RSS settings in the classic interface')}</LegacyLink>
    </div>
  )
}

export function ProxiesSettings({
  value,
  onChange,
}: {
  value: Settings['proxies']
  onChange: (value: Settings['proxies']) => void
}) {
  const { t } = useI18n()

  function updateProxy(index: number, patch: { proxy_name?: string; proxy_url?: string }) {
    const rows = value.extra_proxies.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row))
    onChange({ ...value, extra_proxies: rows })
  }

  function updateBrowser(index: number, patch: { browser_name?: string; browser_connection_url?: string }) {
    const rows = value.extra_browsers.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row))
    onChange({ ...value, extra_browsers: rows })
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="mb-1 text-sm font-semibold">{t('Extra proxies')}</h2>
        <p className="mb-2 text-xs text-muted">{t('HTTP, HTTPS or SOCKS5. Name and URL are both required for a row to be saved.')}</p>
        <div className="space-y-2">
          {value.extra_proxies.map((row, index) => (
            <div key={index} className="grid grid-cols-[1fr_2fr_auto] gap-2">
              <Input value={row.proxy_name || ''} onChange={(event) => updateProxy(index, { proxy_name: event.target.value })} placeholder={t('Name')} aria-label={t('Proxy name')} />
              <Input value={row.proxy_url || ''} onChange={(event) => updateProxy(index, { proxy_url: event.target.value })} placeholder="socks5://user:pass@host:1080" aria-label={t('Proxy URL')} />
              <Button variant="ghost" size="icon" onClick={() => onChange({ ...value, extra_proxies: value.extra_proxies.filter((_, rowIndex) => rowIndex !== index) })} aria-label={t('Remove proxy')}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button variant="secondary" size="sm" className="mt-2" onClick={() => onChange({ ...value, extra_proxies: [...value.extra_proxies, { proxy_name: '', proxy_url: '' }] })}>
          <Plus className="h-4 w-4" /> {t('Add proxy')}
        </Button>
      </div>

      <div>
        <h2 className="mb-1 text-sm font-semibold">{t('Extra browsers')}</h2>
        <p className="mb-2 text-xs text-muted">{t('WebSocket endpoints such as a remote Chrome or Bright Data browser.')}</p>
        <div className="space-y-2">
          {value.extra_browsers.map((row, index) => (
            <div key={index} className="grid grid-cols-[1fr_2fr_auto] gap-2">
              <Input value={row.browser_name || ''} onChange={(event) => updateBrowser(index, { browser_name: event.target.value })} placeholder={t('Name')} aria-label={t('Browser name')} />
              <Input value={row.browser_connection_url || ''} onChange={(event) => updateBrowser(index, { browser_connection_url: event.target.value })} placeholder="wss://host:3000" aria-label={t('Browser WebSocket URL')} />
              <Button variant="ghost" size="icon" onClick={() => onChange({ ...value, extra_browsers: value.extra_browsers.filter((_, rowIndex) => rowIndex !== index) })} aria-label={t('Remove browser')}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button variant="secondary" size="sm" className="mt-2" onClick={() => onChange({ ...value, extra_browsers: [...value.extra_browsers, { browser_name: '', browser_connection_url: '' }] })}>
          <Plus className="h-4 w-4" /> {t('Add browser')}
        </Button>
      </div>
    </div>
  )
}

export function BackupsSettings() {
  const { t, locale } = useI18n()
  const { toast } = useToast()
  const client = useQueryClient()
  const query = useBackups()
  const [pendingDelete, setPendingDelete] = useState<Backup | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [includeGroups, setIncludeGroups] = useState(true)
  const [includeWatches, setIncludeWatches] = useState(true)
  const [replace, setReplace] = useState(true)

  const create = useMutation({
    mutationFn: () => apiFetch('/backups', { method: 'POST' }),
    onSuccess: () => toast(t('Backup started in the background. Refresh in a moment.'), { tone: 'info' }),
    onError: (error) => toast(error.message, { tone: 'error' }),
  })

  const remove = useMutation({
    mutationFn: (filename: string) => apiFetch(`/backups/${encodeURIComponent(filename)}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast(t('Backup removed'), { tone: 'success' })
      setPendingDelete(null)
      client.invalidateQueries({ queryKey: ['backups'] })
    },
    onError: (error) => toast(error.message, { tone: 'error' }),
  })

  const restore = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error(t('Choose a backup file'))
      const form = new FormData()
      form.append('file', file)
      form.append('include_groups', String(includeGroups))
      form.append('include_watches', String(includeWatches))
      form.append('include_groups_replace', String(replace))
      form.append('include_watches_replace', String(replace))
      return apiFetch<{ results: unknown[] }>('/backups/restore', { method: 'POST', formData: form })
    },
    onSuccess: () => {
      toast(t('Backup restored'), { tone: 'success' })
      client.invalidateQueries({ queryKey: ['watches'] })
      client.invalidateQueries({ queryKey: ['groups'] })
      client.invalidateQueries({ queryKey: ['stats'] })
    },
    onError: (error) => toast(error.message, { tone: 'error' }),
  })

  return (
    <div className="space-y-5 p-4 md:p-5">
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{t('Backups')}</h2>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => query.refetch()} loading={query.isFetching}>
              <RefreshCw className="h-4 w-4" /> {t('Refresh')}
            </Button>
            <Button variant="primary" size="sm" onClick={() => create.mutate()} loading={create.isPending}>
              <Archive className="h-4 w-4" /> {t('Create backup')}
            </Button>
          </div>
        </div>

        {query.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : query.data?.items.length ? (
          <ul className="divide-y divide-border rounded-card border border-border">
            {query.data.items.map((backup) => (
              <li key={backup.filename} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs">{backup.filename}</p>
                  <p className="text-[11px] text-muted">
                    {formatBytes(backup.size_bytes)} · {formatDateTime(backup.created_at, locale)}
                  </p>
                </div>
                <a
                  href={`/api/v2/backups/${encodeURIComponent(backup.filename)}/download`}
                  className="inline-flex min-h-11 items-center gap-1 rounded-input border border-border-strong px-2 text-xs font-medium hover:bg-surface-2"
                >
                  <Download className="h-3.5 w-3.5" /> {t('Download')}
                </a>
                <Button variant="ghost" size="icon" onClick={() => setPendingDelete(backup)} aria-label={t('Delete backup')}>
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={Archive} title={t('No backups yet')} description={t('Create a backup before changing many watches or settings.')} />
        )}
      </div>

      <div className="rounded-input border border-border p-3">
        <h2 className="mb-2 text-sm font-semibold">{t('Restore a backup')}</h2>
        <input
          type="file"
          accept=".zip"
          aria-label={t('Choose a backup file')}
          onChange={(event) => setFile(event.target.files?.[0] || null)}
          className="block min-h-11 w-full text-sm text-muted file:mr-3 file:rounded-input file:border-0 file:bg-surface-2 file:px-3 file:py-3 file:text-sm file:font-medium file:text-fg"
        />
        <div className="mt-2 grid gap-1 sm:grid-cols-3">
          <Checkbox label={t('Include groups')} checked={includeGroups} onChange={(event) => setIncludeGroups(event.target.checked)} />
          <Checkbox label={t('Include watches')} checked={includeWatches} onChange={(event) => setIncludeWatches(event.target.checked)} />
          <Checkbox label={t('Replace existing')} checked={replace} onChange={(event) => setReplace(event.target.checked)} />
        </div>
        <Button className="mt-2" variant="secondary" onClick={() => restore.mutate()} loading={restore.isPending} disabled={!file}>
          <Upload className="h-4 w-4" /> {t('Restore backup')}
        </Button>
        <p className="mt-1 text-xs text-muted">{t('A restore can overwrite watches with the same UUID. Use “Replace existing” deliberately.')}</p>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={t('Delete this backup?')}
        description={pendingDelete?.filename}
        confirmLabel={t('Delete backup')}
        destructive
        busy={remove.isPending}
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete.filename)}
      />
    </div>
  )
}

export function InfoSettings({ value }: { value: Settings['info'] }) {
  const { t, locale } = useI18n()
  const rows = [
    { label: t('Version'), value: value.version },
    { label: t('Python'), value: value.python_version },
    { label: t('Uptime'), value: formatDuration(value.uptime_seconds) },
    { label: t('Watches'), value: `${value.watch_count}${value.watch_limit ? ` / ${value.watch_limit}` : ''}` },
    { label: t('Server time'), value: formatDateTime(value.server_time, locale) },
    { label: t('Active plugins'), value: value.active_plugins.length ? value.active_plugins.join(', ') : t('None') },
  ]
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.label} className="flex flex-wrap items-center justify-between gap-2 rounded-input bg-surface-2 px-3 py-2 text-sm">
          <span className="text-muted">{row.label}</span>
          <span className="font-medium">{row.value}</span>
        </div>
      ))}
      <p className="pt-2 text-xs text-muted">
        {t('Pulse is the new interface. The classic UI stays available at its usual routes.')}
      </p>
    </div>
  )
}
