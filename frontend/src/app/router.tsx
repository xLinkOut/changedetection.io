import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { AddWatchPage } from '@/features/dashboard/AddWatchPage'
import { WatchDetailPage } from '@/features/watch/WatchDetailPage'
import { WatchEditPage } from '@/features/watch-edit/WatchEditPage'
import { GroupsPage } from '@/features/groups/GroupsPage'
import { GroupEditPage } from '@/features/groups/GroupEditPage'
import { QueuePage } from '@/features/queue/QueuePage'
import { ImportPage } from '@/features/import/ImportPage'
import { NotificationsPage } from '@/features/notifications/NotificationsPage'
import { NotificationLogPage } from '@/features/notifications/NotificationLogPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { NotFoundPage } from '@/features/NotFoundPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/add" element={<AddWatchPage />} />
      <Route path="/watches/:uuid" element={<Navigate to="changes" replace />} />
      <Route path="/watches/:uuid/changes" element={<WatchDetailPage tab="changes" />} />
      <Route path="/watches/:uuid/preview" element={<WatchDetailPage tab="preview" />} />
      <Route path="/watches/:uuid/screenshot" element={<WatchDetailPage tab="screenshot" />} />
      <Route path="/watches/:uuid/error" element={<WatchDetailPage tab="error" />} />
      <Route path="/watches/:uuid/price" element={<WatchDetailPage tab="price" />} />
      <Route path="/watches/:uuid/edit" element={<WatchEditPage />} />
      <Route path="/watches/:uuid/edit/:section" element={<WatchEditPage />} />
      <Route path="/groups" element={<GroupsPage />} />
      <Route path="/groups/new" element={<GroupEditPage />} />
      <Route path="/groups/:uuid" element={<GroupEditPage />} />
      <Route path="/queue" element={<QueuePage />} />
      <Route path="/import" element={<ImportPage />} />
      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="/notifications/log" element={<NotificationLogPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/:section" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
