import { useQuery } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { fetchBootstrap } from '@/lib/api'
import { I18nProvider } from '@/lib/i18n'
import { AuthProvider } from '@/lib/auth'
import { SSEProvider } from '@/lib/sse'
import { LoginPage } from '@/features/auth/LoginPage'
import { PulseMark } from '@/components/brand/PulseMark'
import { ErrorState } from '@/components/ui/states'
import { AppRoutes } from './router'
import { ErrorBoundary } from './ErrorBoundary'

export function App() {
  const query = useQuery({
    queryKey: ['bootstrap'],
    queryFn: fetchBootstrap,
    staleTime: 60_000,
    retry: 1,
  })

  if (query.isLoading) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3">
        <PulseMark className="h-12 w-12" />
        <p className="text-sm text-muted">Loading Pulse…</p>
      </div>
    )
  }

  if (query.isError || !query.data) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <ErrorState
          title="Could not reach changedetection.io"
          description={
            query.error instanceof Error
              ? query.error.message
              : 'Check that the server is running and try again.'
          }
          onRetry={() => query.refetch()}
        />
      </div>
    )
  }

  const bootstrap = query.data

  return (
    <I18nProvider locale={bootstrap.locale} languages={bootstrap.languages}>
      <AuthProvider bootstrap={bootstrap}>
        {!bootstrap.authenticated ? (
          <LoginPage />
        ) : (
          <SSEProvider enabled={bootstrap.features?.realtime ?? true}>
            <ErrorBoundary>
              <BrowserRouter basename={bootstrap.appBase}>
                <AppRoutes />
              </BrowserRouter>
            </ErrorBoundary>
          </SSEProvider>
        )}
      </AuthProvider>
    </I18nProvider>
  )
}
