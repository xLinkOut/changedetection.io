import { useState } from 'react'
import { ImageOff, ExternalLink } from 'lucide-react'
import { apiBase } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'
import type { WatchFull } from '@/lib/types'
import { EmptyState } from '@/components/ui/states'
import { SegmentedControl } from '@/components/ui/tabs'
import { cn } from '@/lib/cn'

export function ScreenshotTab({ watch }: { watch: WatchFull }) {
  const { t } = useI18n()
  const { bootstrap } = useAuth()
  const [kind, setKind] = useState<'latest' | 'error'>('latest')
  const [failed, setFailed] = useState(false)

  if (!bootstrap.features?.screenshots) {
    return (
      <EmptyState
        icon={ImageOff}
        title={t('Screenshots are not available')}
        description={t('This deployment does not have a screenshot-capable fetcher configured.')}
      />
    )
  }

  const errorMode = kind === 'error'
  if (errorMode && !watch.last_error) {
    return (
      <EmptyState
        icon={ImageOff}
        title={t('No error to show')}
        description={t('This watch has not reported an error.')}
      />
    )
  }

  const source = `${apiBase()}/watches/${watch.uuid}/screenshot?v=${watch.last_checked}${errorMode ? '&error=1' : ''}`

  return (
    <div className="space-y-3 p-3 md:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedControl
          options={[
            { value: 'latest', label: t('Latest screenshot') },
            { value: 'error', label: t('Error screenshot') },
          ]}
          value={kind}
          onChange={(value) => {
            setFailed(false)
            setKind(value as 'latest' | 'error')
          }}
          ariaLabel={t('Screenshot type')}
        />
        <a
          href={source}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" /> {t('Open image')}
        </a>
      </div>

      <p className="text-xs text-muted">
        {t('Diffs are text-based. The screenshot shows the last rendered page, not a pixel diff.')}
      </p>

      {failed ? (
        <EmptyState
          icon={ImageOff}
          title={t('No screenshot available')}
          description={t('The last check did not capture an image for this watch.')}
        />
      ) : (
        <div className={cn('overflow-hidden rounded-card border border-border bg-surface-2')}>
          <img
            src={source}
            alt={errorMode ? t('Error screenshot') : t('Latest screenshot')}
            className="mx-auto h-auto max-w-full"
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
          />
        </div>
      )}
    </div>
  )
}
