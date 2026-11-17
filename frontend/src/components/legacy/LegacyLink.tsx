import type { ReactNode } from 'react'
import { ExternalLink } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/cn'

export function LegacyLink({
  href,
  children,
  className,
  compact = false,
}: {
  href: string
  children?: ReactNode
  className?: string
  compact?: boolean
}) {
  const { bootstrap } = useAuth()
  const { t } = useI18n()
  const url = `${bootstrap.basePath || ''}${href}`

  return (
    <a
      href={url}
      className={cn(
        'inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted hover:text-fg',
        className,
      )}
    >
      <ExternalLink className="h-4 w-4" aria-hidden="true" />
      <span>{children || t('Open legacy screen')}</span>
      {!compact ? <Badge tone="neutral">{t('Legacy')}</Badge> : null}
    </a>
  )
}
