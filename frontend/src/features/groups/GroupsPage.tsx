import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, BellOff, Pencil, Plus, RefreshCw, Tags, Trash2, Unlink } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { useToast } from '@/components/ui/toast'
import { useGroups } from '@/lib/queries'
import type { Group } from '@/lib/types'
import { PageHeader } from '@/components/ui/misc'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm'
import { Dialog, DialogContent, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/ui/states'

export function GroupsPage() {
  const { t, tn } = useI18n()
  const { toast } = useToast()
  const navigate = useNavigate()
  const client = useQueryClient()
  const groupsQuery = useGroups()
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Group | null>(null)
  const [pendingUnlink, setPendingUnlink] = useState<Group | null>(null)

  const create = useMutation({
    mutationFn: (title: string) => apiFetch<Group>('/groups', { method: 'POST', body: { title } }),
    onSuccess: (group) => {
      client.invalidateQueries({ queryKey: ['groups'] })
      toast(t('Group created'), { tone: 'success' })
      setCreateOpen(false)
      setName('')
      navigate(`/groups/${group.uuid}`)
    },
    onError: (error) => toast(error.message, { tone: 'error' }),
  })

  const action = useMutation({
    mutationFn: ({ uuid, op }: { uuid: string; op: 'recheck' | 'unlink' }) =>
      apiFetch(`/groups/${uuid}/${op}`, { method: 'POST' }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['groups'] })
      client.invalidateQueries({ queryKey: ['watches'] })
      toast(t('Group updated'), { tone: 'success' })
      setPendingUnlink(null)
    },
    onError: (error) => toast(error.message, { tone: 'error' }),
  })

  const mute = useMutation({
    mutationFn: ({ uuid, muted }: { uuid: string; muted: boolean }) =>
      apiFetch(`/groups/${uuid}/mute`, { method: 'POST', body: { muted } }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['groups'] })
    },
    onError: (error) => toast(error.message, { tone: 'error' }),
  })

  const remove = useMutation({
    mutationFn: (uuid: string) => apiFetch(`/groups/${uuid}`, { method: 'DELETE' }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['groups'] })
      client.invalidateQueries({ queryKey: ['watches'] })
      toast(t('Group deleted'), { tone: 'success' })
      setPendingDelete(null)
    },
    onError: (error) => toast(error.message, { tone: 'error' }),
  })

  const groups = groupsQuery.data?.items || []

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('Groups')}
        description={t('Share filters, notifications, AI settings and price overrides across watches.')}
        actions={
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> {t('New group')}
          </Button>
        }
      />

      {groupsQuery.isLoading ? (
        <ListSkeleton rows={4} />
      ) : groupsQuery.isError ? (
        <ErrorState
          title={t('Could not load groups')}
          description={groupsQuery.error instanceof Error ? groupsQuery.error.message : undefined}
          onRetry={() => groupsQuery.refetch()}
        />
      ) : groups.length === 0 ? (
        <Card>
          <EmptyState
            icon={Tags}
            title={t('No groups yet')}
            description={t('Create a group to apply shared settings to several watches.')}
            action={<Button onClick={() => setCreateOpen(true)}>{t('Create a group')}</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => (
            <Card key={group.uuid} className="flex flex-col p-4">
              <div className="flex items-start gap-3">
                <span
                  className="mt-1 h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: group.colour }}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <Link to={`/groups/${group.uuid}`} className="truncate text-sm font-semibold hover:text-primary">
                    {group.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted">
                    {tn('{count} watch', '{count} watches', group.watch_count)}
                    {group.url_match_pattern ? ` · ${group.url_match_pattern}` : ''}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {group.notification_muted ? <Badge tone="neutral"><BellOff className="h-3 w-3" /> {t('Muted')}</Badge> : <Badge tone="info"><Bell className="h-3 w-3" /> {t('Notifications on')}</Badge>}
                    {group.llm_backend_profile === true ? <Badge tone="primary">{t('AI on')}</Badge> : null}
                    {group.llm_backend_profile === false ? <Badge tone="neutral">{t('AI off')}</Badge> : null}
                    {group.overrides_watch ? <Badge tone="warning">{t('Overrides watches')}</Badge> : null}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-border pt-2">
                <Button variant="ghost" size="sm" onClick={() => navigate(`/groups/${group.uuid}`)}>
                  <Pencil className="h-3.5 w-3.5" /> {t('Edit')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => action.mutate({ uuid: group.uuid, op: 'recheck' })}>
                  <RefreshCw className="h-3.5 w-3.5" /> {t('Recheck')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => mute.mutate({ uuid: group.uuid, muted: !group.notification_muted })}>
                  {group.notification_muted ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
                  {group.notification_muted ? t('Unmute') : t('Mute')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setPendingUnlink(group)}>
                  <Unlink className="h-3.5 w-3.5" /> {t('Unlink')}
                </Button>
                <Button variant="ghost" size="icon" className="ml-auto" onClick={() => setPendingDelete(group)} aria-label={t('Delete group')}>
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent title={t('New group')} description={t('Give the group a name. You can add filters and settings next.')}>
          <Field label={t('Group name')} htmlFor="group-name" required>
            <Input
              id="group-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoFocus
              onKeyDown={(event) => {
                if (event.key === 'Enter' && name.trim()) create.mutate(name.trim())
              }}
            />
          </Field>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">{t('Cancel')}</Button>
            </DialogClose>
            <Button variant="primary" onClick={() => create.mutate(name.trim())} disabled={!name.trim()} loading={create.isPending}>
              {t('Create group')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={t('Delete this group?')}
        description={pendingDelete ? t('“{title}” will be removed from all watches. The watches themselves stay.').replace('{title}', pendingDelete.title) : undefined}
        confirmLabel={t('Delete group')}
        destructive
        busy={remove.isPending}
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete.uuid)}
      />

      <ConfirmDialog
        open={Boolean(pendingUnlink)}
        onOpenChange={(open) => !open && setPendingUnlink(null)}
        title={t('Unlink this group?')}
        description={pendingUnlink ? t('“{title}” stays as a group, but is removed from every watch.').replace('{title}', pendingUnlink.title) : undefined}
        confirmLabel={t('Unlink group')}
        busy={action.isPending}
        onConfirm={() => pendingUnlink && action.mutate({ uuid: pendingUnlink.uuid, op: 'unlink' })}
      />
    </div>
  )
}
