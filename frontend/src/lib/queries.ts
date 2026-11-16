import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, buildQuery } from './api'
import type {
  Bootstrap,
  Group,
  HistoryResponse,
  PreviewResponse,
  QueueSnapshot,
  Settings,
  Stats,
  Watch,
  WatchFull,
  WatchListResponse,
} from './types'

export interface WatchFilters {
  q?: string
  tag?: string
  status?: 'all' | 'unread' | 'deals' | 'errors' | 'healthy'
  processor?: string
  sort?: string
  order?: 'asc' | 'desc'
}

export function useWatches(filters: WatchFilters) {
  return useQuery({
    queryKey: ['watches', filters],
    queryFn: () =>
      apiFetch<WatchListResponse>(
        `/watches${buildQuery({
          q: filters.q,
          tag: filters.tag,
          status: filters.status,
          processor: filters.processor,
          sort: filters.sort,
          order: filters.order,
        })}`,
      ),
    staleTime: 30_000,
  })
}

export function useWatch(uuid: string | undefined) {
  return useQuery({
    queryKey: ['watch', uuid],
    queryFn: () => apiFetch<WatchFull>(`/watches/${uuid}`),
    enabled: Boolean(uuid),
    staleTime: 10_000,
  })
}

export function useHistory(uuid: string | undefined) {
  return useQuery({
    queryKey: ['watch', uuid, 'history'],
    queryFn: () => apiFetch<HistoryResponse>(`/watches/${uuid}/history`),
    enabled: Boolean(uuid),
    staleTime: 15_000,
  })
}

export function useSnapshot(uuid: string | undefined, timestamp: string | undefined) {
  return useQuery({
    queryKey: ['watch', uuid, 'snapshot', timestamp],
    queryFn: () => apiFetch<string>(`/watches/${uuid}/snapshots/${timestamp}`),
    enabled: Boolean(uuid && timestamp),
    staleTime: Infinity,
  })
}

export function usePreview(uuid: string | undefined, version: string | undefined) {
  return useQuery({
    queryKey: ['watch', uuid, 'preview', version],
    queryFn: () =>
      apiFetch<PreviewResponse>(
        `/watches/${uuid}/preview${buildQuery({ version })}`,
      ),
    enabled: Boolean(uuid),
    staleTime: 10_000,
  })
}

export function useGroups() {
  return useQuery({
    queryKey: ['groups'],
    queryFn: () => apiFetch<{ items: Group[]; total: number; stats: Stats }>('/groups'),
    staleTime: 30_000,
  })
}

export function useGroup(uuid: string | undefined) {
  return useQuery({
    queryKey: ['group', uuid],
    queryFn: () => apiFetch<Group>(`/groups/${uuid}`),
    enabled: Boolean(uuid),
  })
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => apiFetch<Settings>('/settings'),
    staleTime: 30_000,
  })
}

export function useQueue(page = 1, perPage = 50) {
  return useQuery({
    queryKey: ['queue', page, perPage],
    queryFn: () => apiFetch<QueueSnapshot>(`/queue?page=${page}&per_page=${perPage}`),
    staleTime: 10_000,
  })
}

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: () => apiFetch<{ stats: Stats }>('/system/info').then((info) => info.stats),
    staleTime: 30_000,
  })
}

export function useNotificationLogs() {
  return useQuery({
    queryKey: ['notification-logs'],
    queryFn: () => apiFetch<{ lines: string[] }>('/notifications/logs'),
    staleTime: 5_000,
  })
}

export function useBackups() {
  return useQuery({
    queryKey: ['backups'],
    queryFn: () => apiFetch<{ items: Backup[]; total: number }>('/backups'),
    staleTime: 10_000,
  })
}

export interface Backup {
  filename: string
  size_bytes: number
  created_at: number
}

export function useQuickAdd() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      url: string
      processor?: string
      tags?: string[]
      paused?: boolean
      title?: string
    }) => apiFetch<WatchFull>('/watches', { method: 'POST', body: payload }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['watches'] })
      client.invalidateQueries({ queryKey: ['groups'] })
      client.invalidateQueries({ queryKey: ['stats'] })
    },
  })
}

export function useWatchAction() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ uuid, action }: { uuid: string; action: 'recheck' | 'mark-viewed' | 'clear-errors' | 'clear-history' | 'clone' }) =>
      apiFetch(`/watches/${uuid}/${action}`, { method: 'POST' }),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ['watches'] })
      client.invalidateQueries({ queryKey: ['watch', variables.uuid] })
      client.invalidateQueries({ queryKey: ['stats'] })
    },
  })
}

export function useBulkAction() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (payload: { op: string; uuids: string[]; extra_data?: string }) =>
      apiFetch<{ count: number; result?: { message?: string; type?: string } }>('/watches/bulk', {
        method: 'POST',
        body: payload,
      }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['watches'] })
      client.invalidateQueries({ queryKey: ['stats'] })
      client.invalidateQueries({ queryKey: ['groups'] })
    },
  })
}

export function useBootstrapRefresh() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (payload: Bootstrap) => Promise.resolve(payload),
    onSuccess: (payload) => {
      client.setQueryData(['bootstrap'], payload)
    },
  })
}

export function useDeleteWatch() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (uuid: string) => apiFetch(`/watches/${uuid}`, { method: 'DELETE' }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['watches'] })
      client.invalidateQueries({ queryKey: ['stats'] })
    },
  })
}

export function useWatchOptionList() {
  return useQuery({
    queryKey: ['watch-options'],
    queryFn: async () => {
      const bootstrap = await apiFetch<Bootstrap>('/bootstrap')
      return {
        processors: bootstrap.processors || [],
        fetchers: bootstrap.fetchers || [],
      }
    },
    staleTime: 5 * 60_000,
  })
}

export type { Watch }
