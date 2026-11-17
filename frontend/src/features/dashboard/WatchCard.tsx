import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BellOff,
  Clock,
  Eye,
  History,
  Image as ImageIcon,
  Pause,
} from 'lucide-react'
import type { Watch } from '@/lib/types'
import { apiBase } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { formatPrice, hostFromUrl, timeAgo } from '@/lib/format'
import { cn } from '@/lib/cn'
import { Badge, TagPill } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { WatchActionsMenu, WatchQuickActions, type WatchActionHandlers } from './WatchActionsMenu'

export type WatchState = 'checking' | 'queued' | 'error' | 'paused' | 'unread' | 'healthy'

export function watchState(watch: Watch): WatchState {
  if (watch.checking_now) return 'checking'
  if (watch.queued) return 'queued'
  if (watch.last_error) return 'error'
  if (watch.paused) return 'paused'
  if (watch.has_unviewed) return 'unread'
  return 'healthy'
}

export const SPINES: Record<WatchState, string> = {
  checking: 'linear-gradient(180deg,#4896FE,#16C8C7)',
  queued: 'linear-gradient(180deg,#887CFD,#4896FE)',
  error: 'linear-gradient(180deg,#BE2842,#FF7A8A)',
  paused: 'linear-gradient(180deg,#8B87A3,#CBC7DC)',
  unread: 'linear-gradient(180deg,#5347CE,#887CFD)',
  healthy: 'linear-gradient(180deg,#16C8C7,#4896FE)',
}

const STATE_CHIP: Record<WatchState, string> = {
  checking: 'border-azure/30 bg-azure/10 text-info',
  queued: 'border-violet/30 bg-violet/10 text-primary',
  error: 'border-danger/30 bg-danger-bg text-danger',
  paused: 'border-border bg-surface-2 text-muted',
  unread: 'border-violet/35 bg-violet/10 text-primary',
  healthy: 'border-teal/30 bg-teal/10 text-success',
}

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#5347CE,#887CFD)',
  'linear-gradient(135deg,#4896FE,#16C8C7)',
  'linear-gradient(135deg,#887CFD,#4896FE)',
  'linear-gradient(135deg,#16C8C7,#4896FE)',
]

export function WatchFavicon({ watch, size = 38 }: { watch: Watch; size?: number }) {
  const [failed, setFailed] = useState(false)
  const seed = (watch.uuid || watch.url || 'p').charCodeAt(0)
  const gradient = AVATAR_GRADIENTS[seed % AVATAR_GRADIENTS.length]

  if (!watch.has_favicon || failed) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-xl font-display text-sm font-semibold text-white shadow-sm"
        style={{ width: size, height: size, background: gradient }}
        aria-hidden="true"
      >
        {(watch.title || watch.url || '?').trim().slice(0, 1).toUpperCase()}
      </span>
    )
  }
  return (
    <img
      src={`${apiBase()}/watches/${watch.uuid}/favicon?v=${watch.last_checked}`}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="shrink-0 rounded-xl border border-border bg-surface object-contain p-0.5"
      style={{ width: size, height: size }}
    />
  )
}

export function WatchStatusChip({ watch }: { watch: Watch }) {
  const { t } = useI18n()
  const state = watchState(watch)
  const label =
    state === 'checking'
      ? watch.check_status || t('Checking now')
      : state === 'queued'
        ? t('Queued')
        : state === 'error'
          ? t('Error')
          : state === 'paused'
            ? t('Paused')
            : state === 'unread'
              ? t('New change')
              : t('Healthy')

  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-[3px] text-[10px] font-semibold',
        STATE_CHIP[state],
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 shrink-0 rounded-full',
          state === 'checking' && 'animate-pulse bg-info',
          state === 'queued' && 'bg-primary',
          state === 'error' && 'bg-danger',
          state === 'paused' && 'bg-muted',
          state === 'unread' && 'bg-violet',
          state === 'healthy' && 'bg-teal',
        )}
        aria-hidden="true"
      />
      <span className="truncate">{label}</span>
    </span>
  )
}

export function RestockLine({ watch, compact = false }: { watch: Watch; compact?: boolean }) {
  const { t, locale } = useI18n()
  if (!watch.restock) return null
  const { in_stock, price, currency, price_change_percent } = watch.restock
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {in_stock === true ? <Badge tone="success">{t('In stock')}</Badge> : null}
      {in_stock === false ? <Badge tone="danger">{t('Not in stock')}</Badge> : null}
      {price !== null && price !== '' ? (
        <span className={cn('font-semibold text-fg', compact ? 'text-sm' : '')}>
          {formatPrice(price, currency, locale)}
        </span>
      ) : null}
      {price_change_percent !== null && price_change_percent !== undefined ? (
        <span
          className={cn(
            'inline-flex items-center gap-0.5 font-medium',
            price_change_percent < 0 ? 'text-success' : 'text-danger',
          )}
        >
          {price_change_percent < 0 ? (
            <ArrowDownRight className="h-3 w-3" />
          ) : (
            <ArrowUpRight className="h-3 w-3" />
          )}
          {Math.abs(price_change_percent)}%
        </span>
      ) : null}
    </div>
  )
}

export function WatchCard({
  watch,
  selected,
  onSelect,
  handlers,
  onNavigate,
  index = 0,
}: {
  watch: Watch
  selected: boolean
  onSelect: (uuid: string, selected: boolean) => void
  handlers: WatchActionHandlers
  onNavigate: (watch: Watch, destination?: 'edit') => void
  index?: number
}) {
  const { t, locale } = useI18n()
  const state = watchState(watch)

  return (
    <article
      role="listitem"
      className={cn(
        'pulse-card pulse-card-hover signal-spine group relative cursor-pointer p-3 transition-shadow md:p-3.5',
        selected && 'ring-2 ring-primary/60',
        watch.paused && 'opacity-85',
        state === 'unread' && 'unread-sheen',
        state === 'checking' && 'scanning',
      )}
      style={{ '--spine': SPINES[state], animationDelay: `${Math.min(index, 8) * 35}ms` } as CSSProperties}
      onClick={() => onNavigate(watch)}
    >
      <div className="flex items-start gap-2.5 pl-1.5">
        <label
          className="-m-2 flex min-h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-input"
          onClick={(event) => event.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={selected}
            onChange={(event) => onSelect(watch.uuid, event.target.checked)}
            className="h-[18px] w-[18px] rounded border-border-strong text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label={`${t('Select')} ${watch.title || watch.url}`}
          />
        </label>

        <WatchFavicon watch={watch} size={38} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0">
              <Link
                to={`/watches/${watch.uuid}/changes`}
                onClick={(event) => event.stopPropagation()}
                className="block min-h-11 py-2 line-clamp-2 font-display text-[15px] font-semibold leading-5 text-fg transition hover:text-primary"
              >
                {watch.title || watch.url}
              </Link>
              <p className="mt-0.5 truncate text-[11px] text-muted" title={watch.url}>
                {hostFromUrl(watch.url) || watch.url}
              </p>
            </div>
            <WatchActionsMenu watch={watch} handlers={handlers} compact />
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <WatchStatusChip watch={watch} />
            {watch.notification_muted ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted">
                <BellOff className="h-3 w-3" aria-hidden="true" /> {t('Muted')}
              </span>
            ) : null}
            {watch.processor_badge && watch.processor !== 'text_json_diff' ? (
              <Badge tone="info">{watch.processor_badge}</Badge>
            ) : null}
            {watch.is_pdf ? <Badge tone="neutral">PDF</Badge> : null}
          </div>

          {watch.tags.length ? (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {watch.tags.map((tag) => (
                <TagPill key={tag.uuid} title={tag.title} colour={tag.colour} />
              ))}
            </div>
          ) : null}

          {watch.last_error && watch.error_text ? (
            <p className="mt-1.5 line-clamp-2 rounded-lg bg-danger-bg px-2 py-1 text-[11px] text-danger" title={watch.error_text}>
              <AlertCircle className="mr-1 inline h-3 w-3 align-[-2px]" aria-hidden="true" />
              {watch.error_text}
            </p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {t('Checked')} {timeAgo(watch.last_checked, locale)}
            </span>
            <span className="inline-flex items-center gap-1">
              <History className="h-3 w-3" aria-hidden="true" />
              {t('Changed')} {timeAgo(watch.last_changed, locale)}
            </span>
            {watch.history_n ? (
              <span className="inline-flex items-center gap-1">
                <ImageIcon className="h-3 w-3" aria-hidden="true" />
                {watch.history_n}
              </span>
            ) : null}
            {watch.has_unviewed ? (
              <span className="inline-flex items-center gap-1 font-semibold text-primary">
                <Eye className="h-3 w-3" aria-hidden="true" /> {t('Unread')}
              </span>
            ) : null}
            {watch.paused ? (
              <span className="inline-flex items-center gap-1">
                <Pause className="h-3 w-3" aria-hidden="true" /> {t('Paused')}
              </span>
            ) : null}
          </div>

          {watch.restock ? (
            <div className="mt-2">
              <RestockLine watch={watch} />
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-end gap-1.5 border-t border-border/70 pt-2">
        <WatchQuickActions
          watch={watch}
          onRecheck={() => handlers.onRecheck(watch)}
          onEdit={() => onNavigate(watch, 'edit')}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={(event) => {
            event.stopPropagation()
            onNavigate(watch)
          }}
        >
          <History className="h-3.5 w-3.5" aria-hidden="true" />
          {t('History')}
        </Button>
      </div>
    </article>
  )
}

// Kept for screens that only need the status text (watch detail header).
export function WatchStatus({ watch }: { watch: Watch }) {
  return <WatchStatusChip watch={watch} />
}
