import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

type ToastTone = 'success' | 'error' | 'info' | 'warning'

interface ToastItem {
  id: number
  title: string
  description?: string
  tone: ToastTone
}

interface ToastContextValue {
  toast: (title: string, options?: { description?: string; tone?: ToastTone; duration?: number }) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const toneStyles: Record<ToastTone, string> = {
  success: 'border-success/30 bg-success-bg text-success',
  error: 'border-danger/30 bg-danger-bg text-danger',
  info: 'border-info/30 bg-bg text-info',
  warning: 'border-warning/30 bg-warning-bg text-warning',
}

const toneIcons: Record<ToastTone, typeof Info> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  const toast = useCallback(
    (title: string, options?: { description?: string; tone?: ToastTone; duration?: number }) => {
      const id = nextId.current++
      const item: ToastItem = {
        id,
        title,
        description: options?.description,
        tone: options?.tone || 'info',
      }
      setItems((current) => [...current.slice(-2), item])
      const duration = options?.duration ?? 5000
      if (duration > 0) {
        window.setTimeout(() => dismiss(id), duration)
      }
    },
    [dismiss],
  )

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-auto md:left-auto md:right-6 md:top-20 md:items-end"
        aria-live="polite"
        aria-atomic="false"
      >
        {items.map((item) => {
          const Icon = toneIcons[item.tone]
          return (
            <div
              key={item.id}
              role="status"
              className={cn(
                'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-card border p-3 shadow-lg',
                toneStyles[item.tone],
              )}
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{item.title}</p>
                {item.description ? <p className="mt-0.5 text-xs opacity-80">{item.description}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="-m-1 inline-flex h-8 w-8 items-center justify-center rounded-input hover:bg-black/5"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}
