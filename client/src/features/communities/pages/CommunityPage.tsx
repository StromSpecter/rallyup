import { useState } from 'react'
import { FiArrowRight, FiPlus, FiUserCheck } from 'react-icons/fi'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { useAuth } from '@/app/auth'
import { Container, Eyebrow } from '@/shared/components/Container'
import { EmptyState } from '@/shared/components/EmptyState'
import { ErrorState } from '@/shared/components/ErrorState'
import { LoadingRows, LoadingBlock } from '@/shared/components/Loading'
import { PageHeader } from '@/shared/components/PageHeader'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { getCommunity, joinCommunity, updateCommunity } from '@/shared/api/communities'
import { listEvents } from '@/shared/api/events'
import { useAsync } from '@/shared/hooks/useAsync'
import { useAction } from '@/shared/hooks/useAction'
import { memberRoleLabel } from '@/shared/lib/constants'
import { EventCard } from '@/shared/components/EventCard'

export function CommunityPage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [joinedLocally, setJoinedLocally] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editCity, setEditCity] = useState('')
  const [editDescription, setEditDescription] = useState('')

  const community = useAsync((signal) => getCommunity(slug, signal), [slug, user?.id])
  const events = useAsync(
    (signal) => listEvents({ communitySlug: slug, limit: 12 }, signal),
    [slug],
    { enabled: Boolean(slug) },
  )

  const join = useAction(() => joinCommunity(slug), {
    successMessage: 'Kamu sudah bergabung.',
    onSuccess: () => {
      setJoinedLocally(true)
      community.reload()
    },
  })

  const updateAction = useAction(
    () => updateCommunity(slug, { name: editName.trim(), city: editCity.trim(), description: editDescription.trim() }),
    {
      successMessage: 'Komunitas diperbarui.',
      onSuccess: () => {
        setEditOpen(false)
        community.reload()
      },
    },
  )

  if (community.loading) {
    return (
      <Container className="py-8">
        <LoadingBlock />
      </Container>
    )
  }

  if (community.error || !community.data) {
    return (
      <Container className="py-8">
        <ErrorState message={community.error} onRetry={community.reload} />
        <div className="mt-4">
          <Button variant="outline" asChild>
            <Link to="/komunitas">Kembali ke daftar komunitas</Link>
          </Button>
        </div>
      </Container>
    )
  }

  const { community: detail, myRole } = community.data
  const isMember = Boolean(myRole) || joinedLocally
  const canManageSessions = myRole === 'owner' || myRole === 'moderator'

  const handleJoin = () => {
    if (!user) {
      navigate('/masuk', { state: { from: `/komunitas/${slug}` } })
      return
    }
    void join.run()
  }

  return (
    <Container className="py-8">
      <PageHeader
        eyebrow={detail.city}
        title={detail.name}
        description={detail.description || 'Komunitas ini belum menulis deskripsi.'}
        actions={
          <>
            {canManageSessions ? (
              <Button variant="outline" onClick={() => navigate(`/sesi?komunitas=${slug}&buat=1`)}>
                <FiPlus aria-hidden="true" />
                Buat sesi
              </Button>
            ) : null}
            {myRole === 'owner' ? (
              <Button
                variant="outline"
                onClick={() => {
                  setEditName(detail.name)
                  setEditCity(detail.city)
                  setEditDescription(detail.description || '')
                  setEditOpen(true)
                }}
              >
                Edit komunitas
              </Button>
            ) : null}
            {isMember ? (
              <Button variant="outline" disabled>
                <FiUserCheck aria-hidden="true" />
                {memberRoleLabel(myRole)}
              </Button>
            ) : (
              <Button onClick={handleJoin} disabled={join.pending}>
                {join.pending ? 'Memproses...' : 'Gabung komunitas'}
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <section className="space-y-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-display text-xl uppercase">Sesi komunitas</h2>
            <Link
              to={`/peringkat?komunitas=${slug}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Papan peringkat komunitas
              <FiArrowRight aria-hidden="true" />
            </Link>
          </div>

          {events.loading ? <LoadingRows rows={3} /> : null}
          {events.error ? <ErrorState message={events.error} onRetry={events.reload} /> : null}
          {!events.loading && !events.error && (events.data?.items.length ?? 0) === 0 ? (
            <EmptyState
              title="Belum ada sesi"
              description={
                canManageSessions
                  ? 'Susun sesi pertama untuk komunitas ini.'
                  : 'Sesi yang dibuka komunitas ini akan muncul di sini.'
              }
              action={
                canManageSessions ? (
                  <Button size="sm" onClick={() => navigate(`/sesi?komunitas=${slug}&buat=1`)}>
                    Buat sesi
                  </Button>
                ) : undefined
              }
            />
          ) : null}
          {(events.data?.items.length ?? 0) > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {events.data?.items.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : null}
        </section>

        <aside className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-5">
            <Eyebrow>Ringkasan</Eyebrow>
            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Kota</dt>
                <dd className="font-medium">{detail.city}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Anggota</dt>
                <dd className="font-medium tabular-nums">{detail.memberCount}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Peranmu</dt>
                <dd className="font-medium">{memberRoleLabel(myRole)}</dd>
              </div>
            </dl>
          </div>
          {!isMember ? (
            <div className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
              Gabung dulu untuk ikut sesi dan muncul di papan peringkat komunitas ini.
            </div>
          ) : null}
        </aside>
      </div>
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit komunitas</DialogTitle>
            <DialogDescription>Ubah informasi komunitas.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            noValidate
            onSubmit={(event) => {
              event.preventDefault()
              void updateAction.run()
            }}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">Nama komunitas</label>
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                minLength={3}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Kota</label>
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={editCity}
                onChange={(e) => setEditCity(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Deskripsi</label>
              <textarea
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
            {updateAction.error ? (
              <p role="alert" className="text-sm font-medium text-destructive">
                {updateAction.error}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={updateAction.pending}>
                {updateAction.pending ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
</Container>
  )
}
