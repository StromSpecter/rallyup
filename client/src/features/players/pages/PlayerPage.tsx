import { FiActivity, FiArrowLeft, FiAward } from 'react-icons/fi'
import { Link, useParams } from 'react-router-dom'

import { Avatar } from '@/shared/components/Avatar'
import { Container } from '@/shared/components/Container'
import { EmptyState } from '@/shared/components/EmptyState'
import { ErrorState } from '@/shared/components/ErrorState'
import { LoadingRows } from '@/shared/components/Loading'
import { PageHeader, SectionHeading } from '@/shared/components/PageHeader'
import { MatchStatusBadge, Pill } from '@/shared/components/StatusBadge'
import { StatTile } from '@/shared/components/StatTile'
import { Button } from '@/shared/components/ui/button'
import { listCommunities } from '@/shared/api/communities'
import { fetchPlayer, fetchPlayerMatches } from '@/shared/api/players'
import { useAsync } from '@/shared/hooks/useAsync'
import { sportLabel } from '@/shared/lib/constants'
import {
  countSetWins,
  formatDateFull,
  formatPercent,
  formatRating,
  formatSets,
  formatLevel,
} from '@/shared/lib/format'
import type { Community, Match, PlayerRating } from '@/shared/types/api'

function MatchOutcome({ match, userId }: { match: Match; userId: string }) {
  const mine = match.players.find((player) => player.userId === userId)
  const wins = countSetWins(match.score?.sets)
  const won = mine ? (mine.team === 'A' ? wins.a > wins.b : wins.b > wins.a) : false
  const hasScore = Boolean(match.score && match.score.status === 'confirmed')

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
      <div className="min-w-0 flex-1">
        <p className="font-display text-sm uppercase">
          Lapangan {match.court} · Ronde {match.round}
        </p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {match.playedAt ? formatDateFull(match.playedAt) : 'Belum bermain'}
        </p>
      </div>
      <span className="font-display text-sm tabular-nums">
        {match.score ? formatSets(match.score.sets) : 'Belum ada skor'}
      </span>
      {hasScore ? (
        <Pill tone={won ? 'court' : 'outline'}>{won ? 'Menang' : 'Kalah'}</Pill>
      ) : (
        <MatchStatusBadge status={match.status} />
      )}
      <Button variant="ghost" size="sm" asChild>
        <Link to={`/app/matches/${match.id}`}>Detail</Link>
      </Button>
    </li>
  )
}

function RatingCard({ rating, community }: { rating: PlayerRating; community: Community | undefined }) {
  const isProvisional = rating.reliability < 1

  return (
    <li className="flex flex-col gap-3 rounded-sm border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-display text-sm uppercase">{sportLabel(rating.sport)}</p>
          {community ? (
            <Link
              to={`/komunitas/${community.slug}`}
              className="text-xs text-muted-foreground hover:text-primary"
            >
              {community.name}
            </Link>
          ) : (
            <p className="text-xs text-muted-foreground">Komunitas tidak ditemukan</p>
          )}
        </div>
        {isProvisional ? <Pill tone="outline">Provisional</Pill> : null}
      </div>
      <p className="font-display text-3xl tabular-nums">{formatRating(rating.skillRating)}</p>
      <dl className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="text-muted-foreground">Poin musim</dt>
          <dd className="font-medium tabular-nums">{rating.seasonPoints}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Menang</dt>
          <dd className="font-medium tabular-nums">{rating.wins}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Kalah</dt>
          <dd className="font-medium tabular-nums">{rating.losses}</dd>
        </div>
      </dl>
      <p className="text-xs text-muted-foreground">
        Reliabilitas {formatPercent(rating.reliability)} · {rating.matches} pertandingan
      </p>
    </li>
  )
}

export function PlayerPage() {
  const { userId = '' } = useParams<{ userId: string }>()

  const profile = useAsync((signal) => fetchPlayer(userId, signal), [userId], {
    enabled: Boolean(userId),
  })
  const history = useAsync((signal) => fetchPlayerMatches(userId, 20, signal), [userId], {
    enabled: Boolean(userId),
  })
  const communities = useAsync((signal) => listCommunities(signal), [])

  if (profile.loading) {
    return (
      <Container className="py-8">
        <LoadingRows rows={4} />
      </Container>
    )
  }

  if (profile.error || !profile.data) {
    return (
      <Container className="py-8">
        <ErrorState message={profile.error} onRetry={profile.reload} />
        <div className="mt-4">
          <Button variant="outline" asChild>
            <Link to="/sesi">
              <FiArrowLeft aria-hidden="true" />
              Kembali ke sesi
            </Link>
          </Button>
        </div>
      </Container>
    )
  }

  const { user, level, ratings, totalMatches, totalWins } = profile.data
  const winRate = totalMatches > 0 ? totalWins / totalMatches : 0
  const communityById = new Map((communities.data?.items ?? []).map((item) => [item.id, item]))
  const matches = history.data?.items ?? []

  return (
    <Container className="py-8">
      <PageHeader
        eyebrow="Profil pemain"
        title={user.name}
        description={formatLevel(level)}
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
        <aside className="space-y-4">
          <div className="flex flex-col items-center gap-3 rounded-sm border border-border bg-card p-6 text-center">
            <Avatar name={user.name} color={user.avatarColor} size="xl" />
            <div className="space-y-1">
              <p className="font-display text-xl uppercase">{user.name}</p>
              <p className="text-sm text-muted-foreground">{formatLevel(level)}</p>
            </div>
            {user.email ? (
              <p className="text-xs text-muted-foreground">{user.email}</p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Bergabung {formatDateFull(user.createdAt)}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-sm border border-border bg-card p-5">
            <StatTile label="Main" value={totalMatches} />
            <StatTile label="Menang" value={totalWins} />
            <StatTile label="Rasio" value={formatPercent(winRate)} />
          </div>
        </aside>

        <div className="space-y-8">
          <section className="space-y-4">
            <SectionHeading
              title="Rating per komunitas"
              hint={`${ratings.length} komunitas`}
            />
            {ratings.length === 0 ? (
              <EmptyState
                icon={<FiAward />}
                title="Belum ada rating"
                description="Rating muncul setelah pemain menyelesaikan pertandingan yang skornya dikonfirmasi."
                action={
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/sesi">Cari sesi</Link>
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {ratings.map((rating) => (
                  <RatingCard
                    key={`${rating.communityId}-${rating.sport}`}
                    rating={rating}
                    community={communityById.get(rating.communityId)}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <SectionHeading title="Riwayat pertandingan" hint={`${matches.length} terakhir`} />
            {history.loading ? <LoadingRows rows={4} /> : null}
            {history.error ? <ErrorState message={history.error} onRetry={history.reload} /> : null}
            {!history.loading && !history.error && matches.length === 0 ? (
              <EmptyState
                icon={<FiActivity />}
                title="Belum ada pertandingan"
                description="Pertandingan yang diikuti pemain ini akan muncul di sini."
              />
            ) : null}
            {matches.length > 0 ? (
              <ul className="divide-y divide-border border-y border-border">
                {matches.map((match) => (
                  <MatchOutcome key={match.id} match={match} userId={userId} />
                ))}
              </ul>
            ) : null}
          </section>
        </div>
      </div>
    </Container>
  )
}
