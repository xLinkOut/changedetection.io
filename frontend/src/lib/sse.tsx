import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { apiBase } from './api'
import { useI18n } from './i18n'
import { useToast } from '@/components/ui/toast'
import type { Stats, Watch, WatchFull, WatchListResponse } from './types'

export type ConnectionState = 'connecting' | 'live' | 'reconnecting' | 'offline' | 'disabled'

interface SSEContextValue {
  state: ConnectionState
  lastEventAt: number | null
  retry: () => void
}

const SSEContext = createContext<SSEContextValue | null>(null)

interface LiveWatchPayload {
  uuid: string
  watch?: Partial<Watch>
  last_checked?: number
  last_changed?: number
  history_n?: number
  fetch_time?: number | null
  has_error?: boolean
  error_text?: string
  status?: string
  started_at?: number
  position?: unknown
}

function patchLists(client: ReturnType<typeof useQueryClient>, uuid: string, patch: Partial<Watch>) {
  client.setQueriesData<WatchListResponse>({ queryKey: ['watches'] }, (old) => {
    if (!old) return old
    let changed = false
    const items = old.items.map((item) => {
      if (item.uuid !== uuid) return item
      changed = true
      return { ...item, ...patch }
    })
    return changed ? { ...old, items } : old
  })
  client.setQueryData<WatchFull>(['watch', uuid], (old) => (old ? { ...old, ...patch } : old))
}

function removeFromLists(client: ReturnType<typeof useQueryClient>, uuid: string) {
  client.setQueriesData<WatchListResponse>({ queryKey: ['watches'] }, (old) => {
    if (!old) return old
    const items = old.items.filter((item) => item.uuid !== uuid)
    return items.length === old.items.length ? old : { ...old, items }
  })
  client.removeQueries({ queryKey: ['watch', uuid] })
}

export function SSEProvider({
  enabled,
  children,
}: {
  enabled: boolean
  children: ReactNode
}) {
  const client = useQueryClient()
  const { toast } = useToast()
  const { t } = useI18n()
  const [state, setState] = useState<ConnectionState>(enabled ? 'connecting' : 'disabled')
  const [lastEventAt, setLastEventAt] = useState<number | null>(null)
  const [generation, setGeneration] = useState(0)
  const hadConnection = useRef(false)
  const tRef = useRef(t)
  const toastRef = useRef(toast)

  useEffect(() => {
    tRef.current = t
    toastRef.current = toast
  }, [t, toast])

  useEffect(() => {
    if (!enabled) {
      setState('disabled')
      return
    }

    setState(navigator.onLine === false ? 'offline' : 'connecting')
    const source = new EventSource(`${apiBase()}/events`, { withCredentials: true })

    source.onopen = () => {
      setState('live')
      setLastEventAt(Date.now())
      if (hadConnection.current) {
        // Exactly one refetch after a reconnect; EventSource keeps retrying on
        // its own and we never poll.
        client.invalidateQueries()
      }
      hadConnection.current = true
    }

    source.onerror = () => {
      setState(navigator.onLine === false ? 'offline' : 'reconnecting')
    }

    const listen = <T,>(name: string, handler: (payload: T) => void) => {
      source.addEventListener(name, (event) => {
        setLastEventAt(Date.now())
        try {
          handler(JSON.parse((event as MessageEvent).data) as T)
        } catch {
          // A malformed frame must not tear down the stream.
        }
      })
    }

    listen<Stats & { server_time: number }>('hello', (payload) => {
      client.setQueryData(['stats'], payload)
      setState('live')
    })

    listen('heartbeat', () => {
      setState('live')
    })

    listen<{ reason: string }>('resync', () => {
      client.invalidateQueries()
    })

    listen<LiveWatchPayload>('watch.updated', (payload) => {
      patchLists(client, payload.uuid, payload.watch || {})
    })

    listen<LiveWatchPayload>('watch.created', (payload) => {
      if (payload.watch) {
        patchLists(client, payload.uuid, payload.watch)
      }
      client.invalidateQueries({ queryKey: ['watches'] })
      client.invalidateQueries({ queryKey: ['stats'] })
      toastRef.current(tRef.current('Watch added'), { tone: 'success' })
    })

    listen<LiveWatchPayload>('watch.check_started', (payload) => {
      patchLists(client, payload.uuid, { checking_now: true })
    })

    listen<LiveWatchPayload>('watch.check_finished', (payload) => {
      patchLists(client, payload.uuid, {
        checking_now: false,
        queued: false,
        last_checked: payload.last_checked,
        last_changed: payload.last_changed,
        history_n: payload.history_n,
        fetch_time: payload.fetch_time,
        last_error: payload.has_error,
        error_text: payload.error_text,
      })
      if (payload.last_changed) {
        client.invalidateQueries({ queryKey: ['watch', payload.uuid, 'history'] })
      }
    })

    listen<LiveWatchPayload>('watch.change_detected', (payload) => {
      patchLists(client, payload.uuid, {
        last_changed: payload.last_changed,
        history_n: payload.history_n,
        has_unviewed: true,
        viewed: false,
      })
      client.invalidateQueries({ queryKey: ['watch', payload.uuid, 'history'] })
      client.invalidateQueries({ queryKey: ['watch', payload.uuid, 'preview'] })
    })

    listen<LiveWatchPayload>('watch.error', (payload) => {
      patchLists(client, payload.uuid, {
        last_error: true,
        error_text: payload.error_text,
      })
    })

    listen<LiveWatchPayload>('watch.queued', (payload) => {
      patchLists(client, payload.uuid, { queued: true })
    })

    listen<LiveWatchPayload>('watch.status', (payload) => {
      patchLists(client, payload.uuid, { check_status: payload.status })
    })

    listen<{ uuid: string }>('watch.deleted', (payload) => {
      removeFromLists(client, payload.uuid)
      client.invalidateQueries({ queryKey: ['stats'] })
    })

    listen<{ queue_size: number; checking_now: number }>('queue.updated', (payload) => {
      client.setQueryData<Stats | undefined>(['stats'], (old) =>
        old ? { ...old, queue_size: payload.queue_size, checking_now: payload.checking_now } : old,
      )
      client.invalidateQueries({ queryKey: ['queue'] })
    })

    listen<Stats>('stats.updated', (payload) => {
      client.setQueryData(['stats'], payload)
    })

    listen<{ uuid: string | null; error?: string | null }>('notification.sent', (payload) => {
      if (payload.error) {
        toastRef.current(tRef.current('Notification failed'), {
          description: payload.error,
          tone: 'error',
        })
      } else {
        toastRef.current(
          payload.uuid ? tRef.current('Notification sent') : tRef.current('Test notification sent'),
          { tone: 'success' },
        )
      }
      client.invalidateQueries({ queryKey: ['notification-logs'] })
    })

    listen<{ uuid: string; from_version: string; to_version: string }>('llm.summary_ready', (payload) => {
      client.invalidateQueries({ queryKey: ['summary', payload.uuid] })
    })

    listen<{ uuid: string }>('favicon.updated', (payload) => {
      patchLists(client, payload.uuid, { has_favicon: true })
    })

    listen('group.created', () => client.invalidateQueries({ queryKey: ['groups'] }))
    listen('group.updated', () => {
      client.invalidateQueries({ queryKey: ['groups'] })
      client.invalidateQueries({ queryKey: ['group'] })
    })
    listen('group.deleted', () => {
      client.invalidateQueries({ queryKey: ['groups'] })
      client.invalidateQueries({ queryKey: ['group'] })
      client.invalidateQueries({ queryKey: ['watches'] })
    })

    const online = () => setState((current) => (current === 'disabled' ? current : 'connecting'))
    const offline = () => setState((current) => (current === 'disabled' ? current : 'offline'))
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)

    return () => {
      source.close()
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offline)
    }
  }, [client, enabled, generation])

  const retry = useCallback(() => {
    hadConnection.current = false
    setGeneration((value) => value + 1)
  }, [])

  const value = useMemo(() => ({ state, lastEventAt, retry }), [state, lastEventAt, retry])

  return <SSEContext.Provider value={value}>{children}</SSEContext.Provider>
}

export function useSSE() {
  const context = useContext(SSEContext)
  if (!context) throw new Error('useSSE must be used inside SSEProvider')
  return context
}
