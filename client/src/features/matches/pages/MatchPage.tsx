import { useState } from 'react'
import { FiAlertTriangle, FiArrowLeft, FiCheck, FiPlus, FiTrash2 } from 'react-icons/fi'
import { Link, useParams } from 'react-router-dom'

import { useAuth } from '@/app/auth'
import { Container, Eyebrow } from '@/shared/components/Container'
import { ErrorState } from '@/shared/components/ErrorState'
import { TextAreaField, TextField } from '@/shared/components/FormField'
import { LoadingBlock } from '@/shared/components/Loading'
import { LiveIndicator } from '@/shared/components/Marks'
import { PageHeader } from '@/shared/components/PageHeader'
import { MatchStatusBadge, Pill, ScoreStatusBadge } from '@/shared/components/StatusBadge'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { confirmScore, disputeScore, fetchMatch, submitScore } from '@/shared/api/matches'
import { useAction } from '@/shared/hooks/useAction'
import { useAsync } from '@/shared/hooks/useAsync'
import { useSSE } from '@/shared/hooks/useSSE'
import { MATCH_STATUS_HINT, SCORE_STATUS_HINT, sportLabel } from '@/shared/lib/constants'
import { countSetWins, formatDateFull, formatSets, formatTime } from '@/shared/lib/format'
import type { MatchPlayer, SetScore } from '@/shared/types/api'

type SetInput = { a: string; b: string }

function TeamColumn({
  label,
  players,
  won,
}: {
  label: string
  players: MatchPlayer[]
  won: boolean
}) {
  return (
    <div
      className={[
        'flex flex-col gap-3 rounded-lg border p-4',
        won ? 'border-primary bg-primary/5' : 'border-border bg-card',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-sm uppercase">Tim {label}</span>
        {won ? <Pill tone="court">Menang</Pill> : null}
      </div>
      <ul className="space-y-2">
        {players.map((player) => (
          <li key={player.userId}>
            <Link
              to={`/pemain/${player.userId}`}
              className="text-sm font-medium hover:text-primary"
            >
              {player.userName}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SetRows({ sets, onChange }: { sets: SetInput[]; onChange: (next: SetInput[]) => void }) {
  const update = (index: number, key: keyof SetInput, value: string) => {
    onChange(sets.map((set, i) => (i === index ? { ...set, [key]: value } : set)))
  }

  return (
    <div className="space-y-3">
      {sets.map((set, index) => (
        <div key={index} className="flex items-end gap-3">
          <span className="pb-2 text-sm text-muted-foreground">Set {index + 1}</span>
          <TextField
            label="Tim A"
            type="number"
            min={0}
            max={30}
            className="w-24"
            value={set.a}
            onChange={(input) => update(index, 'a', input.target.value)}
          />
          <TextField
            label="Tim B"
            type="number"
            min={0}
            max={30}
            className="w-24"
            value={set.b}
            onChange={(input) => update(index, 'b', input.target.value)}
          />
          {sets.length > 1 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mb-1"
              onClick={() => onChange(sets.filter((_, i) => i !== index))}
            >
              <FiTrash2 aria-hidden="true" />
              Hapus
            </Button>
          ) : null}
        </div>
      ))}
      {sets.length < 5 ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...sets, { a: '', b: '' }])}
        >
          <FiPlus aria-hidden="true" />
          Tambah set
        </Button>
      ) : null}
    </div>
  )
}

export function MatchPage() {
  const { matchId = '' } = useParams<{ matchId: string }>()
  const { user } = useAuth()

  const [sets, setSets] = useState<SetInput[]>([{ a: '', b: '' }])
  const [formError, setFormError] = useState('')
  const [disputeOpen, setDisputeOpen] = useState(false)
  const [reason, setReason] = useState('')

  const detail = useAsync((signal) => fetchMatch(matchId, signal), [matchId], {
    enabled: Boolean(matchId),
  })

  const eventId = detail.data?.event.id
  const streamState = useSSE({
    path: `/stream/events/${eventId}`,
    events: ['score', 'match'],
    enabled: Boolean(eventId),
    onEvent: () => detail.reload(),
  })

  const scoreId = detail.data?.match.score?.id ?? ''

  const submit = useAction((payload: SetScore[]) => submitScore(matchId, payload), {
    successMessage: 'Skor dikirim. Menunggu konfirmasi pihak lain.',
    onSuccess: () => {
      setSets([{ a: '', b: '' }])
      detail.reload()
    },
  })
  const confirm = useAction(() => confirmScore(matchId, scoreId), {
    successMessage: 'Skor dikonfirmasi. Rating diperbarui.',
    onSuccess: () => detail.reload(),
  })
  const dispute = useAction((text: string) => disputeScore(matchId, scoreId, text), {
    successMessage: 'Sanggahan dikirim.',
    onSuccess: () => {
      setDisputeOpen(false)
      setReason('')
      detail.reload()
    },
  })

  if (detail.loading) {
    return (
      <Container className="py-8">
        <LoadingBlock />
      </Container>
    )
  }

  if (detail.error || !detail.data) {
    return (
      <Container className="py-8">
        <ErrorState message={detail.error} onRetry={detail.reload} />
        <div className="mt-4">
          <Button variant="outline" asChild>
            <Link to="/sesi">Lihat semua sesi</Link>
          </Button>
        </div>
      </Container>
    )
  }

  const { match, event, canManage } = detail.data
  const score = match.score
  const teamA = match.players.filter((player) => player.team === 'A')
  const teamB = match.players.filter((player) => player.team === 'B')
  const wins = countSetWins(score?.sets)
  const winner = score ? (wins.b > wins.a ? 'B' : 'A') : null
  const isPlayer = Boolean(user && match.players.some((player) => player.userId === user?.id))
  const canSubmit = Boolean(user && isPlayer && match.status !== 'finished')
  const canRespond =
    Boolean(user && score && score.status === 'pending') &&
    Boolean(canManage || (isPlayer && user?.id !== score?.submittedBy))

  const handleSubmit = () => {
    const parsed: SetScore[] = []
    for (const [index, set] of sets.entries()) {
      if (set.a === '' || set.b === '') {
        setFormError(`Set ${index + 1} belum lengkap.`)
        return
      }
      const a = Number(set.a)
      const b = Number(set.b)
      if (Number.isNaN(a) || Number.isNaN(b) || a < 0 || b < 0 || a > 30 || b > 30) {
        setFormError(`Skor set ${index + 1} harus 0 sampai 30.`)
        return
      }
      if (a === b) {
        setFormError(`Set ${index + 1} tidak boleh seri.`)
        return
      }
      parsed.push({ a, b })
    }
    if (parsed.length === 0) {
      setFormError('Isi minimal satu set.')
      return
    }
    setFormError('')
    void submit.run(parsed)
  }

  return (
    <Container className="py-8">
      <PageHeader
        eyebrow={event.title}
        title={`Lapangan ${match.court} · Ronde ${match.round}`}
        description={
          <span className="space-y-1">
            <span className="block">
              {formatDateFull(event.startsAt)} · {formatTime(event.startsAt)}-
              {formatTime(event.endsAt)}
            </span>
            <span className="block">
              {event.venue}, {event.city} · {sportLabel(event.sport)}
            </span>
          </span>
        }
        actions={
          <>
            <LiveIndicator state={streamState} />
            <MatchStatusBadge status={match.status} />
            <Button variant="outline" asChild>
              <Link to={`/sesi/${event.id}`}>
                <FiArrowLeft aria-hidden="true" />
                Halaman sesi
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <section className="space-y-4 rounded-lg border border-border bg-card p-5">
            <div className="grid items-stretch gap-4 sm:grid-cols-[1fr_auto_1fr]">
              <TeamColumn label="A" players={teamA} won={winner === 'A'} />
              <div className="flex items-center justify-center">
                <span className="font-display text-2xl tabular-nums">
                  {score ? formatSets(score.sets) : 'vs'}
                </span>
              </div>
              <TeamColumn label="B" players={teamB} won={winner === 'B'} />
            </div>
            <p className="text-sm text-muted-foreground">{MATCH_STATUS_HINT[match.status]}</p>
          </section>

          {score ? (
            <section className="space-y-3 rounded-lg border border-border bg-card p-5">
              <div className="flex flex-wrap items-center gap-3">
                <Eyebrow>Skor</Eyebrow>
                <ScoreStatusBadge status={score.status} />
              </div>
              <p className="text-sm text-muted-foreground">{SCORE_STATUS_HINT[score.status]}</p>
              {score.disputeReason ? (
                <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                  Sanggahan: {score.disputeReason}
                </p>
              ) : null}
              {canRespond ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button onClick={() => void confirm.run()} disabled={confirm.pending}>
                    <FiCheck aria-hidden="true" />
                    {confirm.pending ? 'Memproses...' : 'Konfirmasi skor'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setDisputeOpen(true)}
                    disabled={dispute.pending}
                  >
                    <FiAlertTriangle aria-hidden="true" />
                    Sanggah
                  </Button>
                </div>
              ) : null}
            </section>
          ) : null}

          {canSubmit ? (
            <section className="space-y-4 rounded-lg border border-border bg-card p-5">
              <div className="space-y-1">
                <Eyebrow>Isi skor</Eyebrow>
                <p className="text-sm text-muted-foreground">
                  Masukkan skor tiap set dari sisi Tim A dan Tim B. Setelah dikirim, pihak lawan
                  atau organizer perlu mengonfirmasi sebelum rating berubah.
                </p>
              </div>
              <SetRows sets={sets} onChange={setSets} />
              {formError ? (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {formError}
                </p>
              ) : null}
              <Button onClick={handleSubmit} disabled={submit.pending}>
                {submit.pending ? 'Mengirim...' : 'Kirim skor'}
              </Button>
            </section>
          ) : null}

          {!canSubmit && !score ? (
            <p className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
              {match.status === 'finished'
                ? 'Pertandingan ini sudah selesai.'
                : 'Hanya pemain di pertandingan ini yang bisa mengisi skor.'}
            </p>
          ) : null}
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-5">
            <Eyebrow>Konteks</Eyebrow>
            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Sesi</dt>
                <dd className="text-right font-medium">
                  <Link
                    to={`/sesi/${event.id}`}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {event.title}
                  </Link>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Komunitas</dt>
                <dd className="text-right font-medium">{event.communityName}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Status skor</dt>
                <dd className="text-right font-medium">
                  {score ? <ScoreStatusBadge status={score.status} /> : 'Belum diisi'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
            <Eyebrow>Aturan skor</Eyebrow>
            <ul className="mt-3 list-disc space-y-2 pl-4">
              <li>Satu pihak mengisi skor, pihak lain mengonfirmasi.</li>
              <li>Pengirim skor tidak bisa mengonfirmasi skornya sendiri.</li>
              <li>Rating hanya berubah setelah skor terkonfirmasi.</li>
            </ul>
          </div>
        </aside>
      </div>

      <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sanggah skor</DialogTitle>
            <DialogDescription>
              Jelaskan singkat bagian yang tidak sesuai. Organizer sesi akan menengahi.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            noValidate
            onSubmit={(formEvent) => {
              formEvent.preventDefault()
              if (reason.trim().length < 5) return
              void dispute.run(reason.trim())
            }}
          >
            <TextAreaField
              label="Alasan sanggahan"
              required
              minLength={5}
              value={reason}
              onChange={(input) => setReason(input.target.value)}
              placeholder="Contoh: skor set kedua seharusnya 7-5, bukan 6-4."
              hint="Minimal 5 karakter."
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDisputeOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={dispute.pending || reason.trim().length < 5}>
                {dispute.pending ? 'Mengirim...' : 'Kirim sanggahan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Container>
  )
}
