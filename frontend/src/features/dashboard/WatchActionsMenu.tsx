import {
  Bell,
  BellOff,
  CheckCheck,
  Clipboard,
  ExternalLink,
  History,
  MoreVertical,
  Pause,
  Pencil,
  Play,
  RefreshCw,
  Trash2,
  XCircle,
} from 'lucide-react'
import type { Watch } from '@/lib/types'
import { useI18n } from '@/lib/i18n'
import { safeHref } from '@/lib/format'
import { Dropdown, DropdownContent, DropdownItem, DropdownSeparator, DropdownTrigger } from '@/components/ui/dropdown'
import { Button } from '@/components/ui/button'

export interface WatchActionHandlers {
  onRecheck: (watch: Watch) => void
  onTogglePause: (watch: Watch) => void
  onToggleMute: (watch: Watch) => void
  onMarkViewed: (watch: Watch) => void
  onClearErrors: (watch: Watch) => void
  onClone: (watch: Watch) => void
  onClearHistory: (watch: Watch) => void
  onDelete: (watch: Watch) => void
}

export function WatchActionsMenu({
  watch,
  handlers,
  compact = false,
}: {
  watch: Watch
  handlers: WatchActionHandlers
  compact?: boolean
}) {
  const { t } = useI18n()

  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? 'icon' : 'sm'}
          aria-label={t('More actions')}
          onClick={(event) => event.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
          {!compact ? <span className="sr-only">{t('More')}</span> : null}
        </Button>
      </DropdownTrigger>
      <DropdownContent>
        <DropdownItem onSelect={() => handlers.onRecheck(watch)}>
          <RefreshCw className="mr-2 inline h-4 w-4" /> {t('Recheck now')}
        </DropdownItem>
        <DropdownItem onSelect={() => handlers.onTogglePause(watch)}>
          {watch.paused ? <Play className="mr-2 inline h-4 w-4" /> : <Pause className="mr-2 inline h-4 w-4" />}
          {watch.paused ? t('Resume checks') : t('Pause checks')}
        </DropdownItem>
        <DropdownItem onSelect={() => handlers.onToggleMute(watch)}>
          {watch.notification_muted ? <Bell className="mr-2 inline h-4 w-4" /> : <BellOff className="mr-2 inline h-4 w-4" />}
          {watch.notification_muted ? t('Unmute notifications') : t('Mute notifications')}
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem onSelect={() => handlers.onMarkViewed(watch)}>
          <CheckCheck className="mr-2 inline h-4 w-4" /> {t('Mark as viewed')}
        </DropdownItem>
        <DropdownItem onSelect={() => handlers.onClearErrors(watch)} disabled={!watch.last_error}>
          <XCircle className="mr-2 inline h-4 w-4" /> {t('Clear errors')}
        </DropdownItem>
        <DropdownItem onSelect={() => handlers.onClone(watch)}>
          <Clipboard className="mr-2 inline h-4 w-4" /> {t('Clone watch')}
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem onSelect={() => handlers.onClearHistory(watch)} destructive>
          <History className="mr-2 inline h-4 w-4" /> {t('Clear history')}
        </DropdownItem>
        <DropdownItem onSelect={() => handlers.onDelete(watch)} destructive>
          <Trash2 className="mr-2 inline h-4 w-4" /> {t('Delete watch')}
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  )
}

export function WatchQuickActions({
  watch,
  onRecheck,
  onEdit,
}: {
  watch: Watch
  onRecheck: () => void
  onEdit: () => void
}) {
  const { t } = useI18n()
  return (
    <div className="flex items-center gap-1.5" onClick={(event) => event.stopPropagation()}>
      <Button variant="secondary" size="sm" onClick={onRecheck} disabled={watch.checking_now || watch.queued}>
        <RefreshCw className={`h-3.5 w-3.5 ${watch.checking_now ? 'animate-spin' : ''}`} />
        <span className="hidden xs:inline">{watch.queued ? t('Queued') : watch.checking_now ? t('Checking') : t('Recheck')}</span>
      </Button>
      <Button variant="secondary" size="sm" onClick={onEdit}>
        <Pencil className="h-3.5 w-3.5" />
        <span className="hidden xs:inline">{t('Edit')}</span>
      </Button>
    </div>
  )
}

export function WatchOpenLink({ watch }: { watch: Watch }) {
  const { t } = useI18n()
  return (
    <a
      href={safeHref(watch.url)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => event.stopPropagation()}
      className="relative inline-flex h-8 w-8 items-center justify-center rounded-input text-muted after:absolute after:-inset-1.5 hover:bg-surface-2 hover:text-fg"
      aria-label={t('Open the watched page')}
    >
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  )
}
