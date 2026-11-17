import { Link } from 'react-router-dom'
import { AlertCircle, Bell, BellOff, Pause, Pencil, Play, RefreshCw } from 'lucide-react'
import type { Watch } from '@/lib/types'
import { useI18n } from '@/lib/i18n'
import { safeHref, timeAgo } from '@/lib/format'
import { cn } from '@/lib/cn'
import { Badge, TagPill } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { WatchFavicon, WatchStatusChip, RestockLine, SPINES, watchState } from './WatchCard'
import { WatchActionsMenu, type WatchActionHandlers } from './WatchActionsMenu'

export function WatchTableRow({
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
  const state = watchState(watch)

  return (
    <tr
      className={cn(
        'group border-b border-border/70 transition-colors last:border-0 hover:bg-surface-2/70',
        selected && 'bg-primary/[0.06]',
        watch.paused && 'opacity-80',
        state === 'unread' && 'bg-violet/[0.035]',
      )}
    >
      <td className="relative w-10 px-2 py-2">
        <span
          className="absolute inset-y-2 left-0 w-[3px] rounded-r-full"
          style={{ background: SPINES[state] }}
          aria-hidden="true"
        />
        <label className="flex h-11 w-9 cursor-pointer items-center justify-center">
          <input
            type="checkbox"
            checked={selected}
            onChange={(event) => onSelect(watch.uuid, event.target.checked)}
            className="h-[18px] w-[18px] rounded border-border-strong text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label={`${t('Select')} ${watch.title || watch.url}`}
          />
        </label>
      </td>
      <td className="w-[104px] px-2 py-2">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => handlers.onTogglePause(watch)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface-3 hover:text-fg"
            aria-label={watch.paused ? t('Resume checks') : t('Pause checks')}
            title={watch.paused ? t('Resume checks') : t('Pause checks')}
          >
            {watch.paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => handlers.onToggleMute(watch)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface-3 hover:text-fg"
            aria-label={watch.notification_muted ? t('Unmute notifications') : t('Mute notifications')}
            title={watch.notification_muted ? t('Unmute notifications') : t('Mute notifications')}
          >
            {watch.notification_muted ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
          </button>
        </div>
        <div className="mt-0.5">
          <WatchStatusChip watch={watch} />
        </div>
      </td>
      <td className="min-w-0 px-2 py-2.5">
        <div className="flex items-start gap-2.5">
          <WatchFavicon watch={watch} size={34} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <Link
                to={`/watches/${watch.uuid}/changes`}
                className="max-w-[34rem] truncate font-display text-[14px] font-semibold text-fg transition hover:text-primary"
                onClick={(event) => event.stopPropagation()}
              >
                {watch.title || watch.url}
              </Link>
              {watch.has_unviewed ? <Badge tone="primary">{t('Unread')}</Badge> : null}
              {watch.processor !== 'text_json_diff' ? <Badge tone="info">{watch.processor_badge}</Badge> : null}
              {watch.is_pdf ? <Badge tone="neutral">PDF</Badge> : null}
            </div>
            <a
              href={safeHref(watch.url)}
              target="_blank"
              rel="noopener noreferrer"
              className="block max-w-xl truncate text-[11px] text-muted transition hover:text-fg"
              onClick={(event) => event.stopPropagation()}
            >
              {watch.url}
            </a>
            {watch.tags.length ? (
              <div className="mt-1 flex flex-wrap gap-1">
                {watch.tags.map((tag) => (
                  <TagPill key={tag.uuid} title={tag.title} colour={tag.colour} />
                ))}
              </div>
            ) : null}
            {watch.last_error && watch.error_text ? (
              <p className="mt-1 line-clamp-1 max-w-xl text-[11px] text-danger">
                <AlertCircle className="mr-1 inline h-3 w-3 align-[-2px]" aria-hidden="true" />
                {watch.error_text}
              </p>
            ) : null}
          </div>
        </div>
      </td>
      <td className="w-32 px-2 py-2 text-xs text-muted">
        {watch.restock ? <RestockLine watch={watch} compact /> : <span className="text-border-strong">—</span>}
      </td>
      <td className="w-24 whitespace-nowrap px-2 py-2 text-[11px] text-muted">
        {timeAgo(watch.last_checked, locale)}
      </td>
      <td className="w-24 whitespace-nowrap px-2 py-2 text-[11px] text-muted">
        {timeAgo(watch.last_changed, locale)}
      </td>
      <td className="w-[220px] px-2 py-2">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="secondary"
            size="sm"
            className="h-9 bg-surface-2/60"
            onClick={() => handlers.onRecheck(watch)}
            disabled={watch.checking_now || watch.queued}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', watch.checking_now && 'animate-spin')} aria-hidden="true" />
            {watch.queued ? t('Queued') : t('Recheck')}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => onNavigate(watch, 'edit')}
            aria-label={t('Edit')}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <WatchActionsMenu watch={watch} handlers={handlers} compact />
        </div>
      </td>
    </tr>
  )
}
