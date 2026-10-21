import { useState } from 'react'
import { FiChevronRight, FiRepeat } from 'react-icons/fi'
import { Link } from 'react-router-dom'

import { Avatar } from '@/shared/components/Avatar'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { MatchStatusBadge } from '@/shared/components/StatusBadge'
import { formatSets } from '@/shared/lib/format'
import type { BenchPlayer, Match, MatchPlayer } from '@/shared/types/api'

type SwapTarget = {
  match: Match
  out: MatchPlayer
}

// Nama di kartu dibatasi dua kata supaya kolom kiri dan kanan tetap rapi;
// nama lengkap tetap tersedia lewat atribut title dan halaman pemain.
function shortName(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).join(' ')
}

function TeamColumn({
  label,
  players,
  align,
  onPick,
}: {
  label: string
  players: MatchPlayer[]
  align: 'left' | 'right'
  onPick?: (player: MatchPlayer) => void
}) {
  const right = align === 'right'
  return (
    <div className="min-w-0 space-y-2">
      <p
        className={[
          'font-display text-xs uppercase text-muted-foreground',
          right ? 'text-right' : '',
        ].join(' ')}
      >
        Tim {label}
      </p>
      {players.map((player) => (
        <div
          key={player.userId}
          className={['flex items-center gap-1', right ? 'justify-end' : ''].join(' ')}
        >
          <Link
            to={`/pemain/${player.userId}`}
            title={player.userName}
            className="flex min-w-0 items-center gap-2 text-sm hover:text-primary"
          >
            <Avatar name={player.userName} color={player.avatarColor} size="sm" />
            <span className="truncate">{shortName(player.userName)}</span>
          </Link>
          {onPick ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 shrink-0 text-muted-foreground"
              aria-label={`Tukar ${player.userName}`}
              title={`Tukar ${player.userName}`}
              onClick={() => onPick(player)}
            >
              <FiRepeat aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function MatchRow({
  match,
  signedIn,
  canSwap,
  onSwap,
}: {
  match: Match
  signedIn: boolean
  canSwap: boolean
  onSwap: (target: SwapTarget) => void
}) {
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
      <div className="grid grid-cols-2 gap-3 border-y border-border py-3">
        <TeamColumn
          label="A"
          align="left"
          players={teamA}
          onPick={canSwap ? (player) => onSwap({ match, out: player }) : undefined}
        />
        <TeamColumn
          label="B"
          align="right"
          players={teamB}
          onPick={canSwap ? (player) => onSwap({ match, out: player }) : undefined}
        />
      </div>
      {match.score ? (
        <p className="font-display text-lg tabular-nums">{formatSets(match.score.sets)}</p>
      ) : (
        <p className="text-sm text-muted-foreground">Skor belum diisi.</p>
      )}
    </>
  )

  return (
    <li className="rounded-sm border border-border bg-card p-4">
      <div className="space-y-3">{content}</div>
    </li>
  )
}

type PairingsBoardProps = {
  matches: Match[]
  bench: BenchPlayer[]
  signedIn: boolean
  canManage: boolean
  onSwap: (matchId: string, outUserId: string, inUserId: string) => Promise<unknown>
  swapping?: boolean
}

export function PairingsBoard({
  matches,
  bench,
  signedIn,
  canManage,
  onSwap,
  swapping = false,
}: PairingsBoardProps) {
  const [target, setTarget] = useState<SwapTarget | null>(null)

  if (matches.length === 0) {
    return (
      <p className="rounded-sm border border-dashed border-border p-6 text-sm text-muted-foreground">
        Jadwal pertandingan belum disusun. Organizer menyusun pasangan setelah pemain
        yang hadir ditandai.
      </p>
    )
  }

  const rounds = [...new Set(matches.map((match) => match.round))].sort((a, b) => a - b)
  const latestRound = rounds[rounds.length - 1]

  const handleSwap = async (inUserId: string) => {
    if (!target) return
    await onSwap(target.match.id, target.out.userId, inUserId)
    setTarget(null)
  }

  return (
    <div className="space-y-6">
      {bench.length > 0 ? (
        <section className="rounded-sm border border-dashed border-border p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-display text-base uppercase">Menunggu giliran</h3>
            <p className="text-xs text-muted-foreground">Istirahat di ronde {latestRound}</p>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Pemain ini otomatis masuk saat ronde berikutnya disusun. Organizer juga bisa
            menukar mereka dengan pemain di lapangan lewat tombol tukar.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {bench.map((player) => (
              <li
                key={player.userId}
                className="flex items-center gap-2 rounded-sm border border-border bg-card px-2 py-1"
              >
                <Avatar name={player.name} color={player.avatarColor} size="sm" />
                {signedIn ? (
                  <Link
                    to={`/pemain/${player.userId}`}
                    title={player.name}
                    className="text-sm hover:text-primary"
                  >
                    {shortName(player.name)}
                  </Link>
                ) : (
                  <span className="text-sm" title={player.name}>
                    {shortName(player.name)}
                  </span>
                )}
                <span className="text-xs text-muted-foreground tabular-nums">
                  {player.roundsPlayed}x main
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {rounds.map((round) => (
        <section key={round} className="space-y-3">
          <h3 className="font-display text-base uppercase">Ronde {round}</h3>
          <ul className="grid gap-3 sm:grid-cols-2">
            {matches
              .filter((match) => match.round === round)
              .map((match) => (
                <MatchRow
                  key={match.id}
                  match={match}
                  signedIn={signedIn}
                  canSwap={canManage && match.status === 'scheduled'}
                  onSwap={setTarget}
                />
              ))}
          </ul>
        </section>
      ))}

      <Dialog open={Boolean(target)} onOpenChange={(open) => (!open ? setTarget(null) : undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tukar pemain</DialogTitle>
            <DialogDescription>
              {target
                ? `Ganti ${shortName(target.out.userName)} di Ronde ${target.match.round} Lapangan ${target.match.court} dengan pemain yang menunggu giliran.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          {bench.length > 0 ? (
            <div className="space-y-2">
              {bench.map((player) => (
                <button
                  key={player.userId}
                  type="button"
                  disabled={swapping}
                  onClick={() => void handleSwap(player.userId)}
                  className="flex w-full items-center gap-3 rounded-sm border border-border bg-card px-3 py-2 text-left hover:border-primary hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Avatar name={player.name} color={player.avatarColor} size="md" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium" title={player.name}>
                      {shortName(player.name)}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Sudah main {player.roundsPlayed} ronde
                    </span>
                  </span>
                  <FiRepeat aria-hidden="true" className="size-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-sm border border-dashed border-border p-4 text-sm text-muted-foreground">
              Tidak ada pemain yang menunggu giliran. Semua peserta hadir sudah masuk lapangan.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
