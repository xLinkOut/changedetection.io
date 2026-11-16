import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Archive,
  ArrowLeft,
  Bell,
  Filter,
  Globe,
  Info,
  KeyRound,
  Monitor,
  Network,
  Rss,
  Save,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { useToast } from '@/components/ui/toast'
import { useSettings } from '@/lib/queries'
import type { Settings } from '@/lib/types'
import { PageHeader } from '@/components/ui/misc'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorState, Skeleton } from '@/components/ui/states'
import { LegacyLink } from '@/components/legacy/LegacyLink'
import { cn } from '@/lib/cn'
import {
  ApiSettings,
  AiSettings,
  BackupsSettings,
  FetchingSettings,
  FiltersSettings,
  GeneralSettings,
  InfoSettings,
  NotificationsSettings,
  ProxiesSettings,
  RssSettings,
  UiSettings,
  type SettingsSection,
} from './settingsSections'

type RouteSection =
  | 'general'
  | 'fetching'
  | 'filters'
  | 'ui'
  | 'api'
  | 'notifications'
  | 'ai'
  | 'rss'
  | 'proxies'
  | 'backups'
  | 'info'

const homeSections: {
  section: RouteSection
  title: string
  description: string
  icon: typeof SlidersHorizontal
}[] = [
  { section: 'general', title: 'General', description: 'Defaults, schedule, password, timezone.', icon: SlidersHorizontal },
  { section: 'fetching', title: 'Fetching', description: 'Workers, timeout, user agent, browser wait.', icon: Globe },
  { section: 'filters', title: 'Global filters', description: 'Whitespace, anchors, ignore text.', icon: Filter },
  { section: 'ui', title: 'Interface', description: 'Theme, list, time format, diff behaviour.', icon: Monitor },
  { section: 'api', title: 'API key', description: 'External API access and key rotation.', icon: KeyRound },
  { section: 'notifications', title: 'Notifications', description: 'Apprise URLs, title, body, format.', icon: Bell },
  { section: 'ai', title: 'AI / LLM', description: 'Provider, model, prompts, token budget.', icon: Sparkles },
  { section: 'rss', title: 'RSS', description: 'Feed content, template, muted watches.', icon: Rss },
  { section: 'proxies', title: 'Proxies & browsers', description: 'Proxy list and remote browser connections.', icon: Network },
  { section: 'backups', title: 'Backups', description: 'Create, download, restore and remove backups.', icon: Archive },
  { section: 'info', title: 'Info', description: 'Version, uptime, plugins, limits.', icon: Info },
]

const validSections = new Set(homeSections.map((item) => item.section))

export function SettingsPage() {
  const { section } = useParams<{ section?: string }>()
  const navigate = useNavigate()
  const { t } = useI18n()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const settingsQuery = useSettings()
  const [draft, setDraft] = useState<Settings | null>(null)

  useEffect(() => {
    if (settingsQuery.data && !draft) {
      setDraft(structuredClone(settingsQuery.data))
    }
  }, [settingsQuery.data, draft])

  const save = useMutation({
    mutationFn: ({ key, value }: { key: SettingsSection; value: unknown }) =>
      apiFetch<{ settings: Settings }>('/settings', { method: 'PUT', body: { [key]: value } }),
    onSuccess: (data) => {
      setDraft(structuredClone(data.settings))
      queryClient.setQueryData(['settings'], data.settings)
      queryClient.invalidateQueries({ queryKey: ['bootstrap'] })
      toast(t('Settings saved'), { tone: 'success' })
    },
    onError: (error) => toast(error instanceof Error ? error.message : t('Could not save settings'), { tone: 'error' }),
  })

  if (settingsQuery.isLoading || !draft) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
      </div>
    )
  }

  if (settingsQuery.isError) {
    return (
      <ErrorState
        title={t('Could not load settings')}
        description={settingsQuery.error instanceof Error ? settingsQuery.error.message : undefined}
        onRetry={() => settingsQuery.refetch()}
      />
    )
  }

  if (!section) {
    return (
      <div className="space-y-4">
        <PageHeader title={t('Settings')} description={t('Global defaults for every watch on this instance.')} />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {homeSections.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.section}
                to={`/settings/${item.section}`}
                className="pulse-card flex items-start gap-3 p-4 transition-colors hover:border-border-strong hover:bg-surface-2/40"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-input bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{t(item.title)}</span>
                  <span className="mt-0.5 block text-xs text-muted">{t(item.description)}</span>
                </span>
              </Link>
            )
          })}
        </div>
        <div className="pulse-card p-4">
          <h2 className="text-sm font-semibold">{t('Advanced screens still in the classic interface')}</h2>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
            <LegacyLink href="/settings/ai/mcp" compact>
              {t('MCP server settings')}
            </LegacyLink>
            <LegacyLink href="/settings" compact>
              {t('Plugin settings')}
            </LegacyLink>
            <LegacyLink href="/settings#general" compact>
              {t('PWA install page')}
            </LegacyLink>
            <LegacyLink href="/imports/import" compact>
              {t('XLSX / Distill.io import')}
            </LegacyLink>
          </div>
        </div>
        <p className="text-xs text-muted">
          {t('Pulse')} {draft.info.version} · {t('Classic interface')}:{' '}
          <a href="/settings" className="text-primary hover:underline">
            /settings
          </a>
        </p>
      </div>
    )
  }

  if (!validSections.has(section as RouteSection)) {
    return <ErrorState title={t('Settings section not found')} onRetry={() => navigate('/settings')} />
  }

  const key = section as RouteSection
  const sectionMeta = homeSections.find((item) => item.section === key)!
  const draftKey = (key === 'ai' ? 'llm' : key) as SettingsSection

  function patchSection(value: unknown) {
    setDraft((current) => (current ? { ...current, [draftKey]: value } : current))
  }

  function onSave() {
    if (!draft) return
    if (key === 'info' || key === 'backups' || key === 'api') return
    save.mutate({ key: draftKey, value: draft[draftKey] })
  }

  return (
    <div className="mx-auto max-w-4xl pb-20">
      <Link to="/settings" className="mb-2 inline-flex min-h-8 items-center gap-1 text-sm text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> {t('All settings')}
      </Link>

      <PageHeader
        title={t(sectionMeta.title)}
        description={t(sectionMeta.description)}
        actions={
          key !== 'info' && key !== 'backups' && key !== 'api' ? (
            <Button variant="primary" onClick={onSave} loading={save.isPending}>
              <Save className="h-4 w-4" /> {t('Save')}
            </Button>
          ) : null
        }
      />

      <Card>
        <CardHeader>
          <div>
            <CardTitle>{t(sectionMeta.title)}</CardTitle>
            <CardDescription>{t(sectionMeta.description)}</CardDescription>
          </div>
          <sectionMeta.icon className="h-5 w-5 text-muted" aria-hidden="true" />
        </CardHeader>
        <div className={cn('p-4 md:p-5', key === 'backups' && 'p-0')}>
          {key === 'general' ? (
            <GeneralSettings
              value={draft.general}
              onChange={patchSection}
              timezones={draft.info.available_timezones}
              passwordLocked={draft.general.password_locked}
              proxies={draft.proxies.proxy_list}
            />
          ) : null}
          {key === 'fetching' ? <FetchingSettings value={draft.fetching} onChange={patchSection} /> : null}
          {key === 'filters' ? <FiltersSettings value={draft.filters} onChange={patchSection} /> : null}
          {key === 'ui' ? <UiSettings value={draft.ui} onChange={patchSection} /> : null}
          {key === 'api' ? <ApiSettings value={draft.api} /> : null}
          {key === 'notifications' ? <NotificationsSettings value={draft.notifications} onChange={patchSection} /> : null}
          {key === 'ai' ? <AiSettings value={draft.llm} onChange={patchSection} /> : null}
          {key === 'rss' ? <RssSettings value={draft.rss} onChange={patchSection} /> : null}
          {key === 'proxies' ? <ProxiesSettings value={draft.proxies} onChange={patchSection} /> : null}
          {key === 'backups' ? <BackupsSettings /> : null}
          {key === 'info' ? <InfoSettings value={draft.info} /> : null}
        </div>
      </Card>

      {key !== 'info' && key !== 'backups' && key !== 'api' ? (
        <div className="sticky bottom-20 mt-3 flex justify-end lg:bottom-4">
          <Button variant="primary" onClick={onSave} loading={save.isPending}>
            <Save className="h-4 w-4" /> {t('Save')}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
