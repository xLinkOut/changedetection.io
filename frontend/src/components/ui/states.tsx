import type { LucideIcon } from 'lucide-react'
import { AlertCircle, Inbox, Loader2, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Button } from './button'
import { useI18n } from '@/lib/i18n'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-input bg-surface-2', className)} aria-hidden="true" />
}

export function Spinner({ className, label = 'Loading' }: { className?: string; label?: string }) {
  return (
    <span role="status" aria-label={label} className={cn('inline-flex', className)}>
      <Loader2 className="h-5 w-5 animate-spin text-muted" />
    </span>
  )
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-muted">
        <Icon className="h-7 w-7" aria-hidden="true" />
      </div>
      <h2 className="text-base font-semibold text-fg">{title}</h2>
      {description ? <div className="mt-1 max-w-sm text-sm text-muted">{description}</div> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

export function ErrorState({
  title,
  description,
  onRetry,
  className,
}: {
  title?: string
  description?: ReactNode
  onRetry?: () => void
  className?: string
}) {
  const { t } = useI18n()
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger-bg text-danger">
        <AlertCircle className="h-7 w-7" aria-hidden="true" />
      </div>
      <h2 className="text-base font-semibold text-fg">{title || t('Something went wrong')}</h2>
      {description ? <div className="mt-1 max-w-sm text-sm text-muted">{description}</div> : null}
      {onRetry ? (
        <Button className="mt-5" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {t('Try again')}
        </Button>
      ) : null}
    </div>
  )
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  const { t } = useI18n()
  return (
    <div className="space-y-2 p-3" aria-busy="true" aria-label={t('Loading')}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="pulse-card flex items-center gap-3 p-4">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  )
}
