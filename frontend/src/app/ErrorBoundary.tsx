import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep the console useful without sending watch data anywhere.
    console.error('Pulse render error', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex min-h-[60dvh] items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger-bg text-danger">
            <AlertTriangle className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted">
            Pulse hit an unexpected error while rendering this screen. Your data is safe.
          </p>
          <pre className="mt-3 max-h-32 overflow-auto rounded-input bg-surface-2 p-2 text-left text-xs text-muted">
            {this.state.error.message}
          </pre>
          <div className="mt-5 flex justify-center gap-2">
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4" /> Reload
            </Button>
            <Button variant="ghost" onClick={() => window.location.assign('/pulse')}>
              Back to watches
            </Button>
          </div>
        </div>
      </div>
    )
  }
}
