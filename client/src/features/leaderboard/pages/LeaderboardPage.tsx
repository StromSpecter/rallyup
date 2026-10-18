import { motion, MotionConfig } from 'motion/react'
import { Link, useSearchParams } from 'react-router-dom'

import { Avatar } from '@/shared/components/Avatar'
import { Container } from '@/shared/components/Container'
import { EmptyState } from '@/shared/components/EmptyState'
import { ErrorState } from '@/shared/components/ErrorState'
import { SelectField } from '@/shared/components/FormField'
import { LoadingRows } from '@/shared/components/Loading'
import { LiveIndicator } from '@/shared/components/Marks'
import { PageHeader } from '@/shared/components/PageHeader'
import { SegmentedControl } from '@/shared/components/SegmentedControl'
import { Pill } from '@/shared/components/StatusBadge'
import { Button } from '@/shared/components/ui/button'
import { listCommunities } from '@/shared/api/communities'
import { fetchLeaderboard } from '@/shared/api/leaderboard'
import { useAsync } from '@/shared/hooks/useAsync'
import { useSSE } from '@/shared/hooks/useSSE'
import { formatPercent, formatRating } from '@/shared/lib/format'
import type {
  LeaderboardKind,
  LeaderboardUpdate,
  Sport,
} from '@/shared/types/api'

const PRIMARY_LABEL: Record<LeaderboardKind, string> = {
  skill: 'Rating',
  season: 'Poin',
  participation: 'Sesi',
}

// Angka utama yang ditonjolkan per jenis papan, supaya satu baris tetap terbaca
// saat jenisnya berganti.
function primaryValue(kind: LeaderboardKind, row: { skillRating: number; seasonPoints: number; participation: number }): string {
  if (kind === 'skill') return formatRating(row.skillRating)
  if (kind === 'season') return String(row.seasonPoints)
  return String(row.participation)
}

function isSport(value: string): value is Sport {
  return value === 'padel' || value === 'tennis'
}

function isKind(value: string): value is LeaderboardKind {
  return value === 'skill' || value === 'season' || value === 'participation'
}

export function LeaderboardPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const communities = useAsync((signal) => listCommunities(signal), [])
  const communityItems = communities.data?.items ?? []

  const slugParam = searchParams.get('komunitas') ?? ''
  const slug = slugParam || communityItems[0]?.slug || ''
  const sportParam = searchParams.get('cabang') ?? ''
  const sport: Sport = isSport(sportParam) ? sportParam : 'padel'
  const kindParam = searchParams.get('jenis') ?? ''
  const kind: LeaderboardKind = isKind(kindParam) ? kindParam : 'skill'

  const board = useAsync(
    (signal) => fetchLeaderboard(slug, sport, kind, signal),
    [slug, sport, kind],
    { enabled: Boolean(slug) },
  )

  // Siaran hanya mengirim papan skill. Papan jenis lain tetap bisa dibuka, tapi
  // tidak ikut berubah sampai pengguna memuat ulang, jadi tidak dijanjikan live.
  const streamState = useSSE({
    path: '/stream/leaderboard',
    params: { communitySlug: slug, sport },
    events: ['leaderboard'],
    enabled: Boolean(slug) && kind === 'skill',
    onEvent: (_event, data) => {
      const update = data as LeaderboardUpdate
      if (!update?.rows || update.sport !== sport) return
      board.setData((previous) => (previous ? { ...previous, rows: update.rows } : previous))
    },
  })

  const setParam = (key: string, value: string) => {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        next.set(key, value)
        return next
      },
      { replace: true },
    )
  }

  const rows = board.data?.rows ?? []
  const community = board.data?.community ?? communityItems.find((item) => item.slug === slug)

  return (
    <Container className="py-8">
      <PageHeader
        eyebrow="Peringkat"
        title="Papan peringkat komunitas"
        description="Peringkat dihitung dari hasil pertandingan yang sudah dikonfirmasi, bukan dari jumlah sesi yang diikuti."
        actions={kind === 'skill' ? <LiveIndicator state={streamState} /> : null}
      />

      <div className="mb-6 flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Komunitas"
            value={slug}
            disabled={communities.loading || communityItems.length === 0}
            onChange={(input) => setParam('komunitas', input.target.value)}
          >
            {communityItems.length === 0 ? <option value="">Memuat komunitas...</option> : null}
            {communityItems.map((item) => (
              <option key={item.id} value={item.slug}>
                {item.name} · {item.city}
              </option>
            ))}
          </SelectField>

          <div className="space-y-2">
            <span className="text-sm font-medium">Cabang olahraga</span>
            <div>
              <SegmentedControl
                label="Cabang olahraga"
                value={sport}
                options={[
                  { value: 'padel', label: 'Padel' },
                  { value: 'tennis', label: 'Tenis' },
                ]}
                onChange={(value) => setParam('cabang', value)}
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium">Jenis papan</span>
          <div>
            <SegmentedControl
              label="Jenis papan peringkat"
              value={kind}
              options={[
                { value: 'skill', label: 'Skill' },
                { value: 'season', label: 'Poin musim' },
                { value: 'participation', label: 'Partisipasi' },
              ]}
              onChange={(value) => setParam('jenis', value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {kind === 'skill'
              ? 'Memakai rating Elo. Pemain baru masih provisional sampai 10 pertandingan terkonfirmasi.'
              : kind === 'season'
                ? 'Menang memberi 3 poin, ikut bermain memberi 1 poin.'
                : 'Jumlah pertandingan terkonfirmasi tiap pemain.'}
          </p>
        </div>
      </div>

      {communities.error ? (
        <ErrorState message={communities.error} onRetry={communities.reload} />
      ) : null}

      {!communities.error && communities.loading && !slug ? <LoadingRows rows={6} /> : null}

      {!communities.error && !communities.loading && communityItems.length === 0 ? (
        <EmptyState
          title="Belum ada komunitas"
          description="Papan peringkat muncul setelah ada komunitas dengan hasil pertandingan terkonfirmasi."
          action={
            <Button asChild size="sm">
              <Link to="/komunitas">Lihat komunitas</Link>
            </Button>
          }
        />
      ) : null}

      {slug && board.loading ? <LoadingRows rows={6} /> : null}
      {slug && board.error ? <ErrorState message={board.error} onRetry={board.reload} /> : null}

      {slug && !board.loading && !board.error && rows.length === 0 ? (
        <EmptyState
          title="Belum ada peringkat"
          description={`Belum ada hasil terkonfirmasi untuk ${sport === 'padel' ? 'padel' : 'tenis'} di komunitas ini. Peringkat akan terisi setelah pertandingan pertama selesai.`}
          action={
            <Button asChild size="sm" variant="outline">
              <Link to="/sesi">Cari sesi</Link>
            </Button>
          }
        />
      ) : null}

      {rows.length > 0 ? (
        <div className="space-y-4">
          {community ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                <Link
                  to={`/komunitas/${community.slug}`}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {community.name}
                </Link>{' '}
                · {sport === 'padel' ? 'Padel' : 'Tenis'} · {rows.length} pemain
              </p>
              <span className="text-xs text-muted-foreground">
                Diperbarui saat skor dikonfirmasi.
              </span>
            </div>
          ) : null}

          <MotionConfig reducedMotion="user">
            <ol className="divide-y divide-border border-y border-border">
              {rows.map((row) => (
                <motion.li
                  key={row.userId}
                  layout
                  transition={{ type: 'spring', stiffness: 380, damping: 40 }}
                  className={[
                    'flex flex-wrap items-center gap-x-3 gap-y-2 px-2 py-3',
                    row.rank === 1 ? 'bg-primary/5' : '',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'w-7 shrink-0 text-center font-display text-lg tabular-nums',
                      row.rank === 1 ? 'text-primary' : 'text-muted-foreground',
                    ].join(' ')}
                  >
                    {row.rank}
                  </span>
                  <Avatar name={row.name} color={row.avatarColor} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/pemain/${row.userId}`}
                        className="truncate font-medium hover:text-primary"
                      >
                        {row.name}
                      </Link>
                      {row.provisional ? <Pill tone="outline">Provisional</Pill> : null}
                    </div>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {row.wins} menang · {row.losses} kalah · {row.matches} pertandingan
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-lg tabular-nums">
                      {primaryValue(kind, row)}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {PRIMARY_LABEL[kind]} · reliabilitas {formatPercent(row.reliability)}
                    </p>
                  </div>
                </motion.li>
              ))}
            </ol>
          </MotionConfig>

          <p className="text-xs text-muted-foreground">
            Reliabilitas menunjukkan seberapa banyak pertandingan terkonfirmasi yang menopang
            rating. Nilai penuh dicapai setelah 10 pertandingan.
          </p>
        </div>
      ) : null}
    </Container>
  )
}
