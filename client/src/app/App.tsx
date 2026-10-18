import { Navigate, Route, Routes, useParams } from 'react-router-dom'

import { AppShell } from './AppShell'
import { NotFoundPage } from './NotFoundPage'
import { RequireAuth } from './RequireAuth'
import { ScrollToTop } from './ScrollToTop'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { LandingPage } from '@/features/home/pages/LandingPage'
import { CommunitiesPage } from '@/features/communities/pages/CommunitiesPage'
import { CommunityPage } from '@/features/communities/pages/CommunityPage'
import { EventsPage } from '@/features/events/pages/EventsPage'
import { EventPage } from '@/features/events/pages/EventPage'
import { MatchPage } from '@/features/matches/pages/MatchPage'
import { LeaderboardPage } from '@/features/leaderboard/pages/LeaderboardPage'
import { PlayerPage } from '@/features/players/pages/PlayerPage'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'
import { ProfilePage } from '@/features/profile/pages/ProfilePage'
import { NotificationsPage } from '@/features/notifications/pages/NotificationsPage'

// Server menyimpan tautan notifikasi dalam bentuk /app/events/{id}. Rute ini
// mengarahkannya ke halaman sesi publik supaya satu tautan tetap bekerja.
function EventFromApp() {
  const { eventId } = useParams<{ eventId: string }>()
  return <Navigate to={`/sesi/${eventId ?? ''}`} replace />
}

export function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<LandingPage />} />

          <Route path="komunitas" element={<CommunitiesPage />} />
          <Route path="komunitas/:slug" element={<CommunityPage />} />

          <Route path="sesi" element={<EventsPage />} />
          <Route path="sesi/:eventId" element={<EventPage />} />

          <Route path="peringkat" element={<LeaderboardPage />} />
          <Route path="pemain/:userId" element={<PlayerPage />} />

          <Route path="masuk" element={<LoginPage />} />
          <Route path="daftar" element={<RegisterPage />} />

          <Route
            path="app"
            element={
              <RequireAuth>
                <DashboardPage />
              </RequireAuth>
            }
          />
          <Route
            path="app/notifikasi"
            element={
              <RequireAuth>
                <NotificationsPage />
              </RequireAuth>
            }
          />
          <Route
            path="app/profil"
            element={
              <RequireAuth>
                <ProfilePage />
              </RequireAuth>
            }
          />
          <Route
            path="app/matches/:matchId"
            element={
              <RequireAuth>
                <MatchPage />
              </RequireAuth>
            }
          />
          <Route
            path="app/events/:eventId"
            element={
              <RequireAuth>
                <EventFromApp />
              </RequireAuth>
            }
          />

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  )
}
