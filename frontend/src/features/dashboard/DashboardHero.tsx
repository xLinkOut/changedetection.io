import { Activity, ArrowUpRight, BellRing, ChevronUp, CircleAlert, Radio, X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { useI18n } from '@/lib/i18n'
import type { Stats } from '@/lib/types'
import { useSSE } from '@/lib/sse'
import { cn } from '@/lib/cn'
import { formatNumber } from '@/lib/format'
import { Button } from '@/components/ui/button'

const BARS = [12, 22, 34, 18, 42, 28, 16, 38, 24, 46, 20, 32, 14, 40, 26, 18, 36, 22, 44, 30, 16, 28]

export function DashboardHero({
  stats,
  locale,
  onMarkAllViewed,
  onRecheckAll,
  busy,
  collapsed,
  onToggleCollapsed,
}: {
  stats: Stats
  locale: string
  onMarkAllViewed: () => void
  onRecheckAll: () => void
  busy?: boolean
  collapsed: boolean
  onToggleCollapsed: () => void
}) {
  const { t } = useI18n()
  const { state } = useSSE()
  const active = stats.checking_now > 0 || state === 'live'
  const showRef = useRef<HTMLButtonElement>(null)
  const hideRef = useRef<HTMLButtonElement>(null)
  const firstRender = useRef(true)

  useEffect(() => {
    // Opening or closing the banner unmounts the button that was used, so move
    // focus to the control that can undo the action instead of dropping it on
    // <body>.
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    ;(collapsed ? showRef : hideRef).current?.focus()
  }, [collapsed])

  if (collapsed) {
    return (
      <section
        id="dashboard-banner"
        aria-label={t('Dashboard banner')}
        className="pulse-card flex min-h-14 animate-fade-in items-center gap-3 px-3 py-2"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal/10 text-success">
          <Radio className={cn('h-4 w-4', active && 'animate-pulse')} aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
            <span className="whitespace-nowrap font-semibold text-fg">
              {formatNumber(stats.watch_count, locale)} {t('watches')}
            </span>
            <span className="h-1 w-1 rounded-full bg-border-strong" aria-hidden="true" />
            <span className={cn('whitespace-nowrap', stats.unread_changes_count > 0 && 'font-semibold text-primary')}>
              {formatNumber(stats.unread_changes_count, locale)} {t('unread')}
            </span>
            {stats.error_count > 0 ? (
              <>
                <span className="h-1 w-1 rounded-full bg-border-strong" aria-hidden="true" />
                <span className="whitespace-nowrap font-semibold text-danger">
                  {formatNumber(stats.error_count, locale)} {t('with errors')}
                </span>
              </>
            ) : null}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-muted">
            {state === 'live' ? t('Live') : t('Reconnecting')} · {stats.checking_now} {t('checking')} ·{' '}
            {stats.queue_size} {t('in queue')}
          </p>
        </div>

        <Button
          ref={showRef}
          variant="secondary"
          size="sm"
          onClick={onToggleCollapsed}
          aria-label={t('Show banner')}
          title={t('Show banner')}
          aria-expanded={false}
          aria-controls="dashboard-banner"
          className="min-w-11 shrink-0"
        >
          <ChevronUp className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">{t('Show banner')}</span>
        </Button>
      </section>
    )
  }

  return (
    <section
      id="dashboard-banner"
      className="signal-hero signal-gradient-border pulse-grain relative overflow-hidden rounded-[26px] px-4 pb-4 pt-6 md:px-7 md:pb-6 md:pt-7"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="aurora-blob -right-24 -top-32 h-72 w-72 bg-azure/30 animate-drift" />
        <div className="aurora-blob -left-20 top-10 h-56 w-56 bg-violet/30 animate-drift [animation-delay:-7s]" />
        <div className="aurora-blob bottom-[-6rem] left-1/3 h-56 w-72 bg-teal/20 animate-drift [animation-delay:-3s]" />
      </div>

      <Button
        ref={hideRef}
        variant="ghost"
        size="icon"
        onClick={onToggleCollapsed}
        aria-label={t('Hide banner')}
        title={t('Hide banner')}
        aria-expanded={true}
        aria-controls="dashboard-banner"
        className="absolute right-2 top-2 z-20 text-muted hover:bg-surface/60 hover:text-fg"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </Button>

      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-10">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            <Radio className={cn('h-3.5 w-3.5', active && 'animate-pulse')} aria-hidden="true" />
            {t('Live signal')}
            <span className="h-1 w-1 rounded-full bg-border-strong" aria-hidden="true" />
            <span className="text-muted">{t('now')}</span>
          </div>

          <h1 className="mt-3 max-w-xl font-display text-[30px] font-semibold leading-[1.03] tracking-[-0.035em] md:text-[42px]">
            {t('Every change,')}{' '}
            <span className="signal-gradient-text">{t('in one pulse.')}</span>
          </h1>
          <p className="mt-2.5 hidden max-w-md text-sm leading-6 text-muted md:block">
            {t(
              'A calm, live view of everything you monitor. No reloads, no noise — just the signals that matter.',
            )}
          </p>

          <div className="mt-5 grid max-w-md grid-cols-3 gap-2.5">
            <Metric
              icon={<Activity className="h-3.5 w-3.5" />}
              value={stats.watch_count}
              label={t('watches')}
              locale={locale}
            />
            <Metric
              icon={<BellRing className="h-3.5 w-3.5" />}
              value={stats.unread_changes_count}
              label={t('unread')}
              accent={stats.unread_changes_count > 0}
              locale={locale}
            />
            <Metric
              icon={<CircleAlert className="h-3.5 w-3.5" />}
              value={stats.error_count}
              label={t('with errors')}
              danger={stats.error_count > 0}
              locale={locale}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onMarkAllViewed} loading={busy}>
              {t('Mark all viewed')}
            </Button>
            <Button variant="secondary" size="sm" onClick={onRecheckAll} loading={busy}>
              {t('Recheck all')}
            </Button>
            <span className="ml-1 inline-flex items-center gap-1.5 text-[11px] text-muted lg:hidden">
              <span className="h-1.5 w-1.5 rounded-full bg-teal" aria-hidden="true" />
              {stats.checking_now} {t('checking')} · {stats.queue_size} {t('in queue')}
            </span>
          </div>
        </div>

        <div className="hidden flex-col justify-between rounded-2xl border border-white/40 bg-surface/55 p-3.5 backdrop-blur-md dark:border-white/10 lg:flex lg:p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              {t('Activity')}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-teal/30 bg-teal/10 px-2 py-0.5 text-[10px] font-semibold text-success">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal" />
              {state === 'live' ? t('Live') : t('Reconnecting')}
            </span>
          </div>

          <div className={cn('equalizer mt-3 !h-16', !active && 'is-idle')} aria-hidden="true">
            {BARS.map((height, index) => (
              <span
                key={index}
                className="!w-[5px]"
                style={{
                  height: `${height + 18}px`,
                  animationDelay: `${(index % 9) * 0.09}s`,
                  animationDuration: `${1.1 + (index % 6) * 0.14}s`,
                }}
              />
            ))}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-border/70 bg-surface/70 px-2.5 py-2">
              <p className="text-[9px] uppercase tracking-[0.14em] text-muted">{t('Checking now')}</p>
              <p className="display-number mt-0.5 text-xl">{stats.checking_now}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-surface/70 px-2.5 py-2">
              <p className="text-[9px] uppercase tracking-[0.14em] text-muted">{t('In queue')}</p>
              <p className="display-number mt-0.5 text-xl">{stats.queue_size}</p>
            </div>
          </div>

          <p className="mt-2 flex items-center gap-1 text-[10px] text-muted">
            <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            {t('Streaming changes as they happen')}
          </p>
        </div>
      </div>
    </section>
  )
}

function Metric({
  icon,
  value,
  label,
  accent,
  danger,
  locale,
}: {
  icon: ReactNode
  value: number
  label: string
  accent?: boolean
  danger?: boolean
  locale: string
}) {
  return (
    <div className="rounded-xl border border-white/40 bg-surface/55 px-2.5 py-2 backdrop-blur-md dark:border-white/10 md:px-3">
      <div className="flex items-center gap-1 text-[10px] text-muted">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <p
        className={cn(
          'display-number mt-0.5 text-2xl md:text-[26px]',
          accent && 'signal-gradient-text',
          danger && 'text-danger',
        )}
      >
        {formatNumber(value, locale)}
      </p>
    </div>
  )
}
