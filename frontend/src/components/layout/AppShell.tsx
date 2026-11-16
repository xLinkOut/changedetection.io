import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Bell,
  BellOff,
  Check,
  ChevronDown,
  CirclePause,
  CirclePlay,
  ListChecks,
  LogOut,
  PlusCircle,
  Search,
  Settings,
  Tags,
  Upload,
  ExternalLink,
} from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import { useToast } from '@/components/ui/toast'
import { apiFetch } from '@/lib/api'
import type { Stats } from '@/lib/types'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { CountBadge } from '@/components/ui/badge'
import { Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownSeparator, DropdownTrigger } from '@/components/ui/dropdown'
import { ConnectionIndicator } from './ConnectionIndicator'
import { ThemeToggle } from './ThemeToggle'
import { LanguagePicker } from './LanguagePicker'
import { PulseMark } from '@/features/auth/LoginPage'

const primaryNav = [
  { to: '/', label: 'Watches', icon: Search, end: true, badge: 'unread' as const },
  { to: '/add', label: 'Add watch', icon: PlusCircle },
  { to: '/groups', label: 'Groups', icon: Tags },
  { to: '/queue', label: 'Queue', icon: ListChecks, badge: 'queue' as const },
  { to: '/settings', label: 'Settings', icon: Settings },
]

const secondaryNav = [
  { to: '/import', label: 'Import', icon: Upload },
  { to: '/notifications', label: 'Notifications', icon: Bell },
]

export function AppShell() {
  const { bootstrap, logout, refresh } = useAuth()
  const { t } = useI18n()
  const client = useQueryClient()
  const navigate = useNavigate()
  const { toast } = useToast()
  const mainRef = useRef<HTMLElement>(null)

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

  // Reset scroll when the route changes, like a normal page navigation.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
    window.scrollTo({ top: 0 })
  }, [navigate])

  const allPaused = bootstrap.settings?.allPaused ?? false
  const allMuted = bootstrap.settings?.allMuted ?? false

  return (
    <div className="min-h-[100dvh] bg-bg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-input focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:shadow-lg"
      >
        {t('Skip to content')}
      </a>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex h-16 items-center gap-2.5 px-4">
          <PulseMark />
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-5">Pulse</div>
            <div className="truncate text-[11px] text-muted">changedetection.io</div>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3" aria-label={t('Main navigation')}>
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
          <div className="my-2 h-px bg-border" />
          {secondaryNav.map((item) => (
            <SidebarLink key={item.to} to={item.to} icon={item.icon} label={t(item.label)} />
          ))}
        </nav>

        <div className="space-y-2 border-t border-border p-3">
          <ConnectionIndicator />
          <div className="flex items-center justify-between px-1 text-[11px] text-muted">
            <span>{t('Checking now')}: {stats?.checking_now ?? 0}</span>
            <span>{t('Queue')}: {stats?.queue_size ?? 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ThemeToggle />
              <LanguagePicker compact />
            </div>
            <UserMenu
              allPaused={allPaused}
              allMuted={allMuted}
              onTogglePause={() => status.mutate({ all_paused: !allPaused })}
              onToggleMute={() => status.mutate({ all_muted: !allMuted })}
              onLogout={async () => {
                await logout()
                navigate('/')
              }}
            />
          </div>
          <a
            href={`${bootstrap.basePath || ''}/`}
            className="flex items-center gap-1.5 px-1 text-[11px] text-muted hover:text-fg"
          >
            <ExternalLink className="h-3 w-3" /> {t('Open classic UI')}
          </a>
          <div className="px-1 text-[10px] text-muted">v{bootstrap.version}</div>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-bg/90 px-3 backdrop-blur lg:hidden">
          <PulseMark className="h-7 w-7" />
          <span className="text-sm font-semibold">Pulse</span>
          <div className="ml-auto flex items-center gap-0.5">
            <ConnectionIndicator compact />
            <LanguagePicker compact />
            <ThemeToggle />
            <UserMenu
              allPaused={allPaused}
              allMuted={allMuted}
              onTogglePause={() => status.mutate({ all_paused: !allPaused })}
              onToggleMute={() => status.mutate({ all_muted: !allMuted })}
              onLogout={async () => {
                await logout()
                navigate('/')
              }}
            />
          </div>
        </header>

        <main id="main" ref={mainRef} className="pulse-container pb-24 pt-4 lg:pb-10 lg:pt-6">
          <Outlet />
        </main>
      </div>

      <nav
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface lg:hidden"
        aria-label={t('Main navigation')}
      >
        <div className="grid grid-cols-5">
          {primaryNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium',
                  isActive ? 'text-primary' : 'text-muted',
                )
              }
            >
              <span className="relative">
                <item.icon className="h-5 w-5" aria-hidden="true" />
                {item.badge === 'unread' && stats?.unread_changes_count ? (
                  <span className="absolute -right-2.5 -top-1.5">
                    <CountBadge count={stats.unread_changes_count} />
                  </span>
                ) : null}
                {item.badge === 'queue' && stats?.queue_size ? (
                  <span className="absolute -right-2.5 -top-1.5">
                    <CountBadge count={stats.queue_size} tone="warning" />
                  </span>
                ) : null}
              </span>
              <span>{t(item.label)}</span>
            </NavLink>
          ))}
        </div>
      </nav>
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
          'flex min-h-10 items-center gap-2.5 rounded-input px-2.5 text-sm font-medium',
          isActive ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-surface-2 hover:text-fg',
        )
      }
    >
      <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" aria-hidden="true" />
      <span className="flex-1">{label}</span>
      {count ? <CountBadge count={count} /> : null}
    </NavLink>
  )
}

function UserMenu({
  allPaused,
  allMuted,
  onTogglePause,
  onToggleMute,
  onLogout,
}: {
  allPaused: boolean
  allMuted: boolean
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
      <DropdownContent>
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
