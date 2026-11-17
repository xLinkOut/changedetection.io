import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  BellOff,
  Check,
  ChevronDown,
  CirclePause,
  CirclePlay,
  ExternalLink,
  ListChecks,
  LogOut,
  Plus,
  Search,
  Settings,
  Tags,
  Upload,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import { useSSE } from '@/lib/sse'
import { useToast } from '@/components/ui/toast'
import { apiFetch } from '@/lib/api'
import type { Stats } from '@/lib/types'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { CountBadge } from '@/components/ui/badge'
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownTrigger,
} from '@/components/ui/dropdown'
import { PulseMark } from '@/components/brand/PulseMark'
import { ConnectionIndicator } from './ConnectionIndicator'
import { ThemeToggle } from './ThemeToggle'
import { LanguagePicker } from './LanguagePicker'
import { CommandPalette } from './CommandPalette'

const primaryNav = [
  { to: '/', label: 'Watches', icon: Search, end: true, badge: 'unread' as const },
  { to: '/queue', label: 'Queue', icon: ListChecks, badge: 'queue' as const },
  { to: '/groups', label: 'Groups', icon: Tags },
  { to: '/settings', label: 'Settings', icon: Settings },
]

const secondaryNav = [
  { to: '/import', label: 'Import', icon: Upload },
  { to: '/notifications', label: 'Notifications', icon: Bell },
]

const dockNav = [
  { to: '/', label: 'Watches', icon: Search, end: true },
  { to: '/queue', label: 'Queue', icon: ListChecks },
  { to: '/groups', label: 'Groups', icon: Tags },
  { to: '/settings', label: 'Settings', icon: Settings },
]

const BAR_HEIGHTS = [10, 18, 26, 14, 34, 22, 40, 28, 16, 32, 20, 36, 12, 24, 30, 18, 38, 26, 14, 22]

export function AppShell() {
  const { bootstrap, logout, refresh } = useAuth()
  const { t } = useI18n()
  const { state: liveState } = useSSE()
  const client = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  const mainRef = useRef<HTMLElement>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: () => apiFetch<{ stats: Stats }>('/system/info').then((value) => value.stats),
    initialData: bootstrap.stats,
    staleTime: Infinity,
  })

  const status = useMutation({
    mutationFn: (payload: { all_paused?: boolean; all_muted?: boolean }) =>
      apiFetch('/settings', { method: 'PUT', body: { general: payload } }),
    onSuccess: async (_data, variables) => {
      await refresh()
      client.invalidateQueries({ queryKey: ['settings'] })
      if (variables.all_paused !== undefined) {
        toast(variables.all_paused ? t('All checks paused') : t('All checks resumed'), {
          tone: 'info',
        })
      }
      if (variables.all_muted !== undefined) {
        toast(variables.all_muted ? t('All notifications muted') : t('All notifications unmuted'), {
          tone: 'info',
        })
      }
    },
    onError: (error) => toast(error instanceof Error ? error.message : t('Could not update status'), { tone: 'error' }),
  })

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((value) => !value)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const allPaused = bootstrap.settings?.allPaused ?? false
  const allMuted = bootstrap.settings?.allMuted ?? false
  const signalActive = (stats?.checking_now ?? 0) > 0 || liveState === 'live'

  const userMenu = (
    <UserMenu
      allPaused={allPaused}
      allMuted={allMuted}
      checkingNow={stats?.checking_now ?? 0}
      queueSize={stats?.queue_size ?? 0}
      onTogglePause={() => status.mutate({ all_paused: !allPaused })}
      onToggleMute={() => status.mutate({ all_muted: !allMuted })}
      onLogout={async () => {
        await logout()
        navigate('/')
      }}
    />
  )

  return (
    <div className="relative min-h-[100dvh] bg-bg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-input focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:shadow-lg"
      >
        {t('Skip to content')}
      </a>

      {/* Ambient light. Decorative only, sits behind everything. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="aurora-blob -right-40 -top-52 h-[420px] w-[520px] bg-violet/20 animate-drift" />
        <div className="aurora-blob -left-40 top-1/3 h-[360px] w-[420px] bg-azure/10 animate-drift [animation-delay:-6s]" />
      </div>

      <aside
        className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col overflow-hidden text-white lg:flex"
        style={{ background: 'linear-gradient(180deg, rgb(var(--sidebar)) 0%, rgb(var(--sidebar-2)) 100%)' }}
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-60">
          <div className="aurora-blob -left-16 -top-24 h-56 w-56 bg-[#5347CE]/60" />
          <div className="aurora-blob -right-20 top-6 h-44 w-44 bg-[#16C8C7]/25" />
        </div>

        <div className="relative flex items-center gap-3 px-5 pb-3 pt-6">
          <PulseMark className="h-9 w-9" glow />
          <div className="min-w-0">
            <div className="font-display text-[17px] font-semibold tracking-[-0.02em]">Pulse</div>
            <div className="truncate text-[10px] font-medium uppercase tracking-[0.18em] text-white/40">
              changedetection.io
            </div>
          </div>
        </div>

        <div className="relative px-4 pb-4 pt-2">
          <NavLink
            to="/add"
            className="signal-gradient flex min-h-11 items-center justify-center gap-2 rounded-input text-sm font-semibold text-white shadow-glow transition hover:brightness-110"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t('Add watch')}
          </NavLink>
        </div>

        <nav className="relative flex-1 overflow-y-auto px-3 pt-1" aria-label={t('Main navigation')}>
          <p className="px-3 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
            {t('Monitor')}
          </p>
          {primaryNav.map((item) => (
            <SidebarLink
              key={item.to}
              to={item.to}
              end={item.end}
              icon={item.icon}
              label={t(item.label)}
              count={
                item.badge === 'unread'
                  ? stats?.unread_changes_count
                  : item.badge === 'queue'
                    ? stats?.queue_size
                    : undefined
              }
            />
          ))}
          <p className="px-3 pb-1.5 pt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
            {t('Tools')}
          </p>
          {secondaryNav.map((item) => (
            <SidebarLink key={item.to} to={item.to} icon={item.icon} label={t(item.label)} />
          ))}
        </nav>

        <div className="relative space-y-3 p-3">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045] p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
                {t('Signal')}
              </span>
              <span className="inline-flex items-center gap-1.5 text-[10px] text-white/45">
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    liveState === 'live'
                      ? 'bg-[#16C8C7]'
                      : liveState === 'offline'
                        ? 'bg-[#ff7a8a]'
                        : liveState === 'disabled'
                          ? 'bg-white/30'
                          : 'bg-[#fbbf24]',
                  )}
                />
                {liveState === 'live'
                  ? t('Live')
                  : liveState === 'disabled'
                    ? t('Live updates off')
                    : t('Connecting')}
              </span>
            </div>
            <div className={cn('equalizer mt-2', !signalActive && 'is-idle')} aria-hidden="true">
              {BAR_HEIGHTS.map((height, index) => (
                <span
                  key={index}
                  style={{
                    height: `${height}px`,
                    animationDelay: `${(index % 7) * 0.11}s`,
                    animationDuration: `${1.2 + (index % 5) * 0.16}s`,
                  }}
                />
              ))}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-white/70">
              <div>
                <p className="text-[9px] uppercase tracking-[0.14em] text-white/35">{t('Checking now')}</p>
                <p className="display-number text-lg text-white">{stats?.checking_now ?? 0}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-[0.14em] text-white/35">{t('Queue')}</p>
                <p className="display-number text-lg text-white">{stats?.queue_size ?? 0}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-1">
            <ConnectionIndicator tone="dark" />
            <a
              href={`${bootstrap.basePath || ''}/`}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-input px-2 text-[11px] text-white/45 transition hover:bg-white/10 hover:text-white"
            >
              <ExternalLink className="h-3 w-3" aria-hidden="true" /> {t('Classic UI')}
            </a>
          </div>
          <p className="px-1 text-[10px] text-white/25">Pulse {bootstrap.version}</p>
        </div>
      </aside>

      <div className="lg:pl-[264px]">
        <header className="glass sticky top-0 z-30 hidden h-16 items-center gap-3 border-b border-border/70 px-6 lg:flex">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="group flex min-h-10 w-72 items-center gap-2.5 rounded-input border border-border bg-surface-2/70 px-3 text-left text-sm text-muted transition hover:border-border-strong hover:bg-surface-2"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            <span className="flex-1 truncate">{t('Search or jump to…')}</span>
            <kbd className="rounded-md border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-muted">
              ⌘K
            </kbd>
          </button>

          <div className="ml-auto flex items-center gap-1.5">
            <ConnectionIndicator />
            <Button variant="primary" size="sm" onClick={() => navigate('/add')}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t('Add watch')}
            </Button>
            <LanguagePicker compact />
            <ThemeToggle />
            {userMenu}
          </div>
        </header>

        <header className="glass sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/70 px-3 lg:hidden">
          <PulseMark className="h-8 w-8" />
          <div className="flex flex-col leading-none">
            <span className="font-display text-sm font-semibold">Pulse</span>
            <span className="mt-0.5 text-[9px] uppercase tracking-[0.16em] text-muted">changedetection.io</span>
          </div>
          <div className="ml-auto flex items-center gap-0.5">
            <Button variant="ghost" size="icon" onClick={() => setPaletteOpen(true)} aria-label={t('Search')}>
              <Search className="h-5 w-5" />
            </Button>
            <ThemeToggle />
            {userMenu}
          </div>
        </header>

        <main id="main" ref={mainRef} className="pulse-container pb-32 pt-4 md:pt-5 lg:pb-12 lg:pt-7">
          <Outlet />
        </main>
      </div>

      {/* Floating mobile dock: four destinations plus a raised action. */}
      <nav className="safe-bottom fixed inset-x-2 bottom-2 z-50 lg:hidden" aria-label={t('Main navigation')}>
        <div className="glass mx-auto grid max-w-md grid-cols-5 items-stretch rounded-[24px] border border-border/80 px-1.5 py-1.5 shadow-xl">
          {dockNav.slice(0, 2).map((item) => (
            <DockLink key={item.to} item={item} stats={stats} />
          ))}

          <NavLink to="/add" className="group flex min-w-0 flex-col items-center justify-end">
            <span className="signal-gradient -mt-6 flex h-12 w-12 items-center justify-center rounded-[16px] text-white shadow-glow ring-4 ring-bg transition group-active:scale-95">
              <Plus className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="mt-1 w-full truncate px-0.5 text-center text-[10px] font-medium text-muted">
              {t('Add')}
            </span>
          </NavLink>

          {dockNav.slice(2).map((item) => (
            <DockLink key={item.to} item={item} stats={stats} />
          ))}
        </div>
      </nav>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  )
}

function SidebarLink({
  to,
  label,
  icon: Icon,
  end,
  count,
}: {
  to: string
  label: string
  icon: typeof Search
  end?: boolean
  count?: number
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'group relative mb-0.5 flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition',
          isActive
            ? 'bg-white/10 text-white'
            : 'text-white/50 hover:bg-white/[0.06] hover:text-white/90',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive ? (
            <span className="signal-gradient absolute bottom-2.5 left-0 top-2.5 w-[3px] rounded-r-full" />
          ) : null}
          <Icon
            className={cn('h-[18px] w-[18px] transition', isActive ? 'text-white' : 'text-white/45 group-hover:text-white/80')}
            aria-hidden="true"
          />
          <span className="flex-1">{label}</span>
          {count ? (
            <span className="rounded-full bg-white/12 px-1.5 text-[10px] font-semibold leading-5 text-white/80">
              {count > 999 ? '999+' : count}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  )
}

function DockLink({
  item,
  stats,
}: {
  item: (typeof dockNav)[number]
  stats?: Stats
}) {
  const { t } = useI18n()
  const count =
    item.to === '/' ? stats?.unread_changes_count : item.to === '/queue' ? stats?.queue_size : 0
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          'flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 text-[10px] font-medium transition',
          isActive ? 'text-primary' : 'text-muted',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              'relative flex h-7 w-9 items-center justify-center rounded-lg transition',
              isActive ? 'bg-primary/10' : '',
            )}
          >
            <item.icon className="h-[19px] w-[19px]" aria-hidden="true" />
            {count ? (
              <span className="absolute -right-1 -top-1">
                <CountBadge count={count} tone={item.to === '/queue' ? 'warning' : 'primary'} />
              </span>
            ) : null}
          </span>
          <span className="w-full truncate text-center">{t(item.label)}</span>
        </>
      )}
    </NavLink>
  )
}

function UserMenu({
  allPaused,
  allMuted,
  checkingNow,
  queueSize,
  onTogglePause,
  onToggleMute,
  onLogout,
}: {
  allPaused: boolean
  allMuted: boolean
  checkingNow: number
  queueSize: number
  onTogglePause: () => void
  onToggleMute: () => void
  onLogout: () => void
}) {
  const { t } = useI18n()
  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t('Menu')}>
          <ChevronDown className="h-5 w-5" />
        </Button>
      </DropdownTrigger>
      <DropdownContent className="w-60">
        <div className="mb-1 flex items-center justify-between rounded-input bg-surface-2 px-2.5 py-2 text-[11px] text-muted">
          <span>{t('Checking now')}: {checkingNow}</span>
          <span>{t('Queue')}: {queueSize}</span>
        </div>
        <DropdownLabel>{t('Global status')}</DropdownLabel>
        <DropdownItem onSelect={onTogglePause}>
          {allPaused ? <CirclePlay className="mr-2 inline h-4 w-4" /> : <CirclePause className="mr-2 inline h-4 w-4" />}
          {allPaused ? t('Resume all checks') : t('Pause all checks')}
          {allPaused ? <Check className="ml-2 inline h-4 w-4" /> : null}
        </DropdownItem>
        <DropdownItem onSelect={onToggleMute}>
          {allMuted ? <Bell className="mr-2 inline h-4 w-4" /> : <BellOff className="mr-2 inline h-4 w-4" />}
          {allMuted ? t('Unmute all notifications') : t('Mute all notifications')}
          {allMuted ? <Check className="ml-2 inline h-4 w-4" /> : null}
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem onSelect={onLogout} destructive>
          <LogOut className="mr-2 inline h-4 w-4" />
          {t('Log out')}
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  )
}
