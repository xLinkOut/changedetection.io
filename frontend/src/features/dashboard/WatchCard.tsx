import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  Eye,
  Globe,
  History,
  Image as ImageIcon,
  Pause,
  BellOff,
} from 'lucide-react'
import type { Watch } from '@/lib/types'
import { apiBase } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { formatPrice, hostFromUrl, timeAgo } from '@/lib/format'
import { cn } from '@/lib/cn'
import { Badge, StatusDot, TagPill } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { WatchActionsMenu, WatchQuickActions, type WatchActionHandlers } from './WatchActionsMenu'

export function WatchFavicon({ watch, size = 36 }: { watch: Watch; size?: number }) {
  const [failed, setFailed] = useState(false)
  if (!watch.has_favicon || failed) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted"
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <Globe className="h-4 w-4" />
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
      className="shrink-0 rounded-full border border-border bg-surface object-contain"
      style={{ width: size, height: size }}
    />
  )
}

export function WatchStatus({ watch }: { watch: Watch }) {
  const { t } = useI18n()
  if (watch.checking_now) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
        <StatusDot tone="primary" pulse />
        {watch.check_status || t('Checking now')}
      </span>
    )
  }
  if (watch.queued) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-warning">
        <StatusDot tone="warning" />
        {t('Queued')}
      </span>
    )
  }
  if (watch.last_error) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-danger">
        <StatusDot tone="danger" />
        {t('Error')}
      </span>
    )
  }
  if (watch.paused) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
        <Pause className="h-3 w-3" aria-hidden="true" />
        {t('Paused')}
      </span>
    )
  }
  if (watch.has_unviewed) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
        <StatusDot tone="primary" />
        {t('New change')}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
      <StatusDot tone="success" />
      {t('Healthy')}
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
}: {
  watch: Watch
  selected: boolean
  onSelect: (uuid: string, selected: boolean) => void
  handlers: WatchActionHandlers
  onNavigate: (watch: Watch, destination?: 'edit') => void
}) {
  const { t, locale } = useI18n()

  return (
    <article
      className={cn(
        'pulse-card cursor-pointer p-3 transition-shadow hover:shadow-md md:p-4',
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-bg',
        watch.paused && 'opacity-80',
      )}
      onClick={() => onNavigate(watch)}
    >
      <div className="flex items-start gap-2.5">
        <label
          className="tap-target -m-2 flex shrink-0 cursor-pointer items-center justify-center rounded-input p-2"
          onClick={(event) => event.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={selected}
            onChange={(event) => onSelect(watch.uuid, event.target.checked)}
            className="h-5 w-5 rounded border-border-strong text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label={`${t('Select')} ${watch.title || watch.url}`}
          />
        </label>

        <WatchFavicon watch={watch} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                to={`/watches/${watch.uuid}/changes`}
                onClick={(event) => event.stopPropagation()}
                className="line-clamp-2 text-sm font-semibold leading-5 text-fg hover:text-primary"
              >
                {watch.title || watch.url}
              </Link>
              <p className="mt-0.5 truncate text-xs text-muted" title={watch.url}>
                {hostFromUrl(watch.url) || watch.url}
              </p>
            </div>
            <WatchActionsMenu watch={watch} handlers={handlers} compact />
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <WatchStatus watch={watch} />
            {watch.notification_muted ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted">
                <BellOff className="h-3 w-3" /> {t('Muted')}
              </span>
            ) : null}
            {watch.processor_badge && watch.processor !== 'text_json_diff' ? (
              <Badge tone="info">{watch.processor_badge}</Badge>
            ) : null}
            {watch.has_browser_steps ? <Badge tone="neutral">{t('Steps')}</Badge> : null}
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
            <p className="mt-1.5 line-clamp-2 text-xs text-danger" title={watch.error_text}>
              <AlertCircle className="mr-1 inline h-3 w-3 align-[-2px]" />
              {watch.error_text}
            </p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {t('Checked')} {timeAgo(watch.last_checked, locale)}
            </span>
            <span className="inline-flex items-center gap-1">
              <History className="h-3 w-3" />
              {t('Changed')} {timeAgo(watch.last_changed, locale)}
            </span>
            {watch.history_n ? (
              <span className="inline-flex items-center gap-1">
                <ImageIcon className="h-3 w-3" />
                {watch.history_n}
              </span>
            ) : null}
            {watch.has_unviewed ? (
              <span className="inline-flex items-center gap-1 font-medium text-primary">
                <Eye className="h-3 w-3" /> {t('Unread')}
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

      <div className="mt-2.5 flex items-center justify-end gap-1.5 border-t border-border pt-2.5">
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
          <History className="h-3.5 w-3.5" />
          {t('History')}
        </Button>
      </div>
    </article>
  )
}
