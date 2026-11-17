import { RefreshCw } from 'lucide-react'
import { useSSE } from '@/lib/sse'
import { useI18n } from '@/lib/i18n'
import { timeAgo } from '@/lib/format'
import { StatusDot } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'

const labels = {
  live: 'Live',
  connecting: 'Connecting',
  reconnecting: 'Reconnecting',
  offline: 'Offline',
  disabled: 'Live updates off',
}

export function ConnectionIndicator({
  compact = false,
  tone = 'default',
}: {
  compact?: boolean
  tone?: 'default' | 'dark'
}) {
  const { state, lastEventAt, retry } = useSSE()
  const { t, locale } = useI18n()

  const dotTone =
    state === 'live' ? 'success' : state === 'offline' ? 'danger' : state === 'disabled' ? 'neutral' : 'warning'
  const text = t(labels[state])

  const detail =
    state === 'disabled'
      ? t('Realtime updates are disabled in settings.')
      : lastEventAt
        ? `${t('Last event')} ${timeAgo(lastEventAt / 1000, locale)}`
        : t('Waiting for the first event…')

  return (
    <Tooltip
      content={
        <span>
          {detail}
          {state !== 'live' && state !== 'disabled' ? (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-8 px-2"
              onClick={(event) => {
                event.stopPropagation()
                retry()
              }}
            >
              <RefreshCw className="mr-1 h-3 w-3" /> {t('Retry now')}
            </Button>
          ) : null}
        </span>
      }
    >
      <span
        className={cn(
          'inline-flex min-h-8 items-center gap-2 rounded-full border px-2.5 text-xs font-medium',
          tone === 'dark'
            ? 'border-white/10 bg-white/[0.04] text-white/55'
            : 'border-border bg-surface text-muted',
          compact && 'min-h-0 border-transparent bg-transparent px-1',
        )}
        aria-live="polite"
      >
        <StatusDot tone={dotTone} pulse={state === 'reconnecting' || state === 'connecting'} label={text} />
        {!compact ? <span>{text}</span> : null}
      </span>
    </Tooltip>
  )
}
