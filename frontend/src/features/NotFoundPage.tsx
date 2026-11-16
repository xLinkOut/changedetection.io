import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { EmptyState } from '@/components/ui/states'

export function NotFoundPage() {
  const { t } = useI18n()
  return (
    <EmptyState
      icon={Compass}
      title={t('This page does not exist')}
      description={t('The link may be old, or the screen has moved.')}
      action={
        <Link
          to="/"
          className="inline-flex min-h-11 items-center rounded-input bg-primary px-4 text-sm font-medium text-primary-contrast hover:bg-primary-hover"
        >
          {t('Back to watches')}
        </Link>
      }
    />
  )
}
