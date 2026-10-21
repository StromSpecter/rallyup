import { useCallback, useState } from 'react'
import { FiCalendar, FiPlus, FiSearch, FiX } from 'react-icons/fi'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { useAuth } from '@/app/auth'
import { Container } from '@/shared/components/Container'
import { EmptyState } from '@/shared/components/EmptyState'
import { ErrorState } from '@/shared/components/ErrorState'
import { EventCard } from '@/shared/components/EventCard'
import { LoadingRows } from '@/shared/components/Loading'
import { PageHeader } from '@/shared/components/PageHeader'
import { SegmentedControl } from '@/shared/components/SegmentedControl'
import { Button } from '@/shared/components/ui/button'
import { Pagination } from '@/shared/components/ui/pagination'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { SelectField } from '@/shared/components/FormField'
import { listCommunities } from '@/shared/api/communities'
import { listEvents } from '@/shared/api/events'
import { SPORTS } from '@/shared/lib/constants'
import { useAsync } from '@/shared/hooks/useAsync'
import type { Sport } from '@/shared/types/api'
import { EventFormDialog } from '../components/EventFormDialog'

type Scope = '' | 'joined' | 'mine'

const SPORT_OPTIONS: { value: '' | Sport; label: string }[] = [
  { value: '', label: 'Semua' },
  ...SPORTS.map((sport) => ({ value: sport.value, label: sport.label })),
]

const SCOPE_OPTIONS: { value: Scope; label: string }[] = [
  { value: '', label: 'Semua' },
  { value: 'joined', label: 'Saya ikut' },
  { value: 'mine', label: 'Saya kelola' },
]

const PAGE_SIZE = 9

export function EventsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  const sport = (params.get('sport') ?? '') as '' | Sport
  const status = params.get('status') ?? ''
  const scope = (params.get('scope') ?? '') as Scope
  const communitySlug = params.get('komunitas') ?? ''
  const appliedQuery = params.get('q') ?? ''
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1)
  const createOpen = params.get('buat') === '1'

  const [searchInput, setSearchInput] = useState(appliedQuery)

  const update = useCallback(
    (patch: Record<string, string | undefined>) => {
      setParams((previous) => {
        const next = new URLSearchParams(previous)
        for (const [key, value] of Object.entries(patch)) {
          if (value) next.set(key, value)
          else next.delete(key)
        }
        if (!Object.prototype.hasOwnProperty.call(patch, 'page')) next.delete('page')
        return next
      })
    },
    [setParams],
  )

  const events = useAsync(
    (signal) =>
      listEvents(
        {
          sport: sport || undefined,
          status: status || undefined,
          q: appliedQuery || undefined,
          communitySlug: communitySlug || undefined,
          scope: user ? scope || undefined : undefined,
          from: new Date().toISOString(),
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
        },
        signal,
      ),
    [sport, status, appliedQuery, communitySlug, user ? scope : '', page],
  )
  const items = events.data?.items ?? []
  const total = events.data?.total ?? items.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const communities = useAsync((signal) => listCommunities(signal), [], { enabled: createOpen })

  const hasFilter = Boolean(sport || status || appliedQuery || communitySlug || (user && scope))

  return (
    <Container className="py-8">
      <PageHeader
        eyebrow="Jadwal"
        title="Semua sesi"
        description="Saring berdasarkan cabang olahraga, status, atau sesi yang kamu ikuti."
        actions={
          <Button onClick={() => update({ buat: '1' })}>
            <FiPlus aria-hidden="true" />
            Buat sesi
          </Button>
        }
      />

      <div className="mb-6 flex flex-col gap-4 rounded-sm border border-border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Label>Cabang olahraga</Label>
            <SegmentedControl
              label="Cabang olahraga"
              value={sport}
              options={SPORT_OPTIONS}
              onChange={(value) => update({ sport: value || undefined })}
            />
          </div>

          <form
            className="flex w-full items-end gap-2 sm:w-auto"
            onSubmit={(event) => {
              event.preventDefault()
              update({ q: searchInput.trim() || undefined })
            }}
          >
            <div className="flex-1 space-y-2 sm:w-64">
              <Label htmlFor="cari-sesi">Cari sesi atau lokasi</Label>
              <Input
                id="cari-sesi"
                value={searchInput}
                onChange={(input: any) => setSearchInput(input.target.value)}
                placeholder="Contoh: Dago"
              />
            </div>
            <Button type="submit" variant="outline">
              <FiSearch aria-hidden="true" />
              Cari
            </Button>
          </form>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <SelectField
            label="Status"
            className="w-full sm:w-40"
            value={status}
            onChange={(event) => update({ status: event.target.value || undefined })}
          >
            <option value="">Semua status</option>
            <option value="published">Terbit</option>
            <option value="draft">Draf</option>
            <option value="closed">Ditutup</option>
          </SelectField>

          {user ? (
            <div className="space-y-2">
              <Label>Keterkaitan</Label>
              <SegmentedControl
                label="Sesi yang ditampilkan"
                value={scope}
                options={SCOPE_OPTIONS}
                onChange={(value) => update({ scope: value || undefined })}
              />
            </div>
          ) : null}

          {hasFilter ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setSearchInput('')
                update({ sport: undefined, status: undefined, q: undefined, scope: undefined, komunitas: undefined })
              }}
            >
              <FiX aria-hidden="true" />
              Bersihkan filter
            </Button>
          ) : null}
        </div>

        {communitySlug ? (
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            Daftar ini dibatasi ke satu komunitas.
            <Button variant="link" size="sm" onClick={() => update({ komunitas: undefined })}>
              Tampilkan semua komunitas
            </Button>
          </p>
        ) : null}
      </div>

      {events.loading ? <LoadingRows rows={4} /> : null}
      {events.error ? <ErrorState message={events.error} onRetry={events.reload} /> : null}

      {!events.loading && !events.error && items.length === 0 ? (
        <EmptyState
          icon={<FiCalendar />}
          title="Tidak ada sesi yang cocok"
          description={
            hasFilter
              ? 'Coba hapus sebagian filter atau lihat semua sesi.'
              : 'Belum ada sesi yang dibuka. Kalau kamu pengurus komunitas, buat sesi pertama.'
          }
          action={
            hasFilter ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchInput('')
                  update({ sport: undefined, status: undefined, q: undefined, scope: undefined, komunitas: undefined })
                }}
              >
                Hapus filter
              </Button>
            ) : (
              <Button size="sm" onClick={() => update({ buat: '1' })}>
                Buat sesi
              </Button>
            )
          }
        />
      ) : null}

      {items.length > 0 ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
          {totalPages > 1 ? (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={(nextPage: number) => update({ page: String(nextPage) })}
            />
          ) : null}
        </div>
      ) : null}

      <EventFormDialog
        open={createOpen}
        onOpenChange={(open) => update({ buat: open ? '1' : undefined })}
        communities={(communities.data?.items ?? []).filter(
          (community) => !user || community.createdBy === user.id,
        )}
        defaultCommunityId={undefined}
        onSaved={(saved) => {
          update({ buat: undefined })
          navigate(`/sesi/${saved.id}`)
        }}
      />

      <p className="mt-8 text-sm text-muted-foreground">
        Ingin sesi rutin di komunitasmu?{' '}
        <Link to="/komunitas" className="font-medium text-primary underline-offset-4 hover:underline">
          Kelola komunitas
        </Link>
      </p>
    </Container>
  )
}
