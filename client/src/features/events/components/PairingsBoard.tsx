import { FiChevronRight } from 'react-icons/fi'
import { Link } from 'react-router-dom'

import { Avatar } from '@/shared/components/Avatar'
import { MatchStatusBadge } from '@/shared/components/StatusBadge'
import { formatSets } from '@/shared/lib/format'
import type { Match, MatchPlayer } from '@/shared/types/api'

function TeamLine({ label, players }: { label: string; players: MatchPlayer[] }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-4 shrink-0 font-display text-xs text-muted-foreground">{label}</span>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {players.map((player) => (
          <Link
            key={player.userId}
            to={`/pemain/${player.userId}`}
            className="flex items-center gap-2 text-sm hover:text-primary"
          >
            <Avatar name={player.userName} color={player.avatarColor} size="sm" />
            <span className="truncate">{player.userName}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

function MatchRow({ match, signedIn }: { match: Match; signedIn: boolean }) {
  const teamA = match.players.filter((player) => player.team === 'A')
  const teamB = match.players.filter((player) => player.team === 'B')
  const content = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-sm uppercase">
          {signedIn ? (
            <Link to={`/app/matches/${match.id}`} className="hover:text-primary">
              Ronde {match.round} · Lapangan {match.court}
            </Link>
          ) : (
            <>Ronde {match.round} · Lapangan {match.court}</>
          )}
        </p>
        <div className="flex items-center gap-2">
          <MatchStatusBadge status={match.status} />
          {signedIn ? <FiChevronRight aria-hidden="true" className="size-4 text-muted-foreground" /> : null}
        </div>
      </div>
      <div className="space-y-2">
        <TeamLine label="A" players={teamA} />
        <TeamLine label="B" players={teamB} />
      </div>
      {match.score ? (
        <p className="font-display text-lg tabular-nums">{formatSets(match.score.sets)}</p>
      ) : (
        <p className="text-sm text-muted-foreground">Skor belum diisi.</p>
      )}
    </>
  )

  return (
    <li className="rounded-lg border border-border bg-card p-4">
      <div className="space-y-3">{content}</div>
    </li>
  )
}

export function PairingsBoard({ matches, signedIn }: { matches: Match[]; signedIn: boolean }) {
  if (matches.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
        Jadwal pertandingan belum disusun. Organizer menyusun pasangan setelah pemain
        yang hadir ditandai.
      </p>
    )
  }

  const rounds = [...new Set(matches.map((match) => match.round))].sort((a, b) => a - b)

  return (
    <div className="space-y-6">
      {rounds.map((round) => (
        <section key={round} className="space-y-3">
          <h3 className="font-display text-base uppercase">Ronde {round}</h3>
          <ul className="grid gap-3 sm:grid-cols-2">
            {matches
              .filter((match) => match.round === round)
              .map((match) => (
                <MatchRow key={match.id} match={match} signedIn={signedIn} />
              ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
