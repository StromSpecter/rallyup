import { useState } from 'react'
import { FiPlus, FiUsers } from 'react-icons/fi'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '@/app/auth'
import { Container } from '@/shared/components/Container'
import { EmptyState } from '@/shared/components/EmptyState'
import { ErrorState } from '@/shared/components/ErrorState'
import { LoadingRows } from '@/shared/components/Loading'
import { PageHeader } from '@/shared/components/PageHeader'
import { Button } from '@/shared/components/ui/button'
import { listCommunities } from '@/shared/api/communities'
import { useAsync } from '@/shared/hooks/useAsync'
import { CommunityCard } from '@/shared/components/CommunityCard'
import { CreateCommunityDialog } from '../components/CreateCommunityDialog'

export function CommunitiesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [dialogOpen, setDialogOpen] = useState(false)

  const communities = useAsync((signal) => listCommunities(signal), [])
  const items = communities.data?.items ?? []

  const startCreate = () => {
    if (!user) {
      navigate('/masuk', { state: { from: '/komunitas' } })
      return
    }
    setDialogOpen(true)
  }

  return (
    <Container className="py-8">
      <PageHeader
        eyebrow="Komunitas"
        title="Komunitas padel dan tenis"
        description="Setiap komunitas punya jadwal dan papan peringkatnya sendiri. Gabung untuk ikut sesi berikutnya."
        actions={
          <Button onClick={startCreate}>
            <FiPlus aria-hidden="true" />
            Buat komunitas
          </Button>
        }
      />

      {communities.loading ? <LoadingRows rows={4} /> : null}
      {communities.error ? <ErrorState message={communities.error} onRetry={communities.reload} /> : null}

      {!communities.loading && !communities.error && items.length === 0 ? (
        <EmptyState
          icon={<FiUsers />}
          title="Belum ada komunitas"
          description="Jadilah yang pertama membuat komunitas padel atau tenis di kotamu."
          action={<Button onClick={startCreate}>Buat komunitas</Button>}
        />
      ) : null}

      {items.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((community) => (
            <CommunityCard key={community.id} community={community} />
          ))}
        </div>
      ) : null}

      <section className="mt-12 rounded-lg border border-dashed border-border p-6">
        <h2 className="font-display text-xl uppercase">Belum menemukan yang cocok?</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Komunitas di RallyUp dijalankan anggotanya sendiri. Kalau di kotamu belum ada,
          buat satu dan atur sesi pertama. Kamu jadi pemilik dan bisa menunjuk moderator.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <Link to="/peringkat">Lihat papan peringkat</Link>
          </Button>
        </div>
      </section>

      <CreateCommunityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={(community) => navigate(`/komunitas/${community.slug}`)}
      />
    </Container>
  )
}
