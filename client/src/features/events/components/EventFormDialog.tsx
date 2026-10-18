import { useEffect, useState } from 'react'

import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { SelectField, TextAreaField, TextField } from '@/shared/components/FormField'
import { createEvent, updateEvent } from '@/shared/api/events'
import type { EventPayload } from '@/shared/api/events'
import { useAction } from '@/shared/hooks/useAction'
import { fromDatetimeLocal, toDatetimeLocal } from '@/shared/lib/format'
import type { Community, Event, EventFormat, Sport } from '@/shared/types/api'

type EventFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  communities: Community[]
  defaultCommunityId?: string
  event?: Event
  onSaved: (event: Event) => void
}

type FormState = {
  communityId: string
  title: string
  sport: Sport
  format: EventFormat
  venue: string
  city: string
  startsAt: string
  endsAt: string
  capacity: string
  fee: string
  levelMin: string
  levelMax: string
  notes: string
  status: string
}

function initialState(
  communities: Community[],
  defaultCommunityId: string | undefined,
  event: Event | undefined,
): FormState {
  if (event) {
    return {
      communityId: event.communityId,
      title: event.title,
      sport: event.sport,
      format: event.format,
      venue: event.venue,
      city: event.city,
      startsAt: toDatetimeLocal(event.startsAt),
      endsAt: toDatetimeLocal(event.endsAt),
      capacity: String(event.capacity),
      fee: String(event.fee),
      levelMin: String(event.levelMin),
      levelMax: String(event.levelMax),
      notes: event.notes,
      status: event.status,
    }
  }

  const fallback = communities.find((item) => item.id === defaultCommunityId) ?? communities[0]
  return {
    communityId: fallback?.id ?? '',
    title: '',
    sport: 'padel',
    format: 'doubles',
    venue: '',
    city: fallback?.city ?? '',
    startsAt: '',
    endsAt: '',
    capacity: '8',
    fee: '0',
    levelMin: '1',
    levelMax: '7',
    notes: '',
    status: 'published',
  }
}

export function EventFormDialog({
  open,
  onOpenChange,
  communities,
  defaultCommunityId,
  event,
  onSaved,
}: EventFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        {open ? (
          <EventForm
            communities={communities}
            defaultCommunityId={defaultCommunityId}
            event={event}
            onClose={() => onOpenChange(false)}
            onSaved={onSaved}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function EventForm({
  communities,
  defaultCommunityId,
  event,
  onClose,
  onSaved,
}: {
  communities: Community[]
  defaultCommunityId?: string
  event?: Event
  onClose: () => void
  onSaved: (event: Event) => void
}) {
  const editing = Boolean(event)
  const [form, setForm] = useState<FormState>(() => initialState(communities, defaultCommunityId, event))

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((previous) => ({ ...previous, [key]: value }))

  useEffect(() => {
    if (event) return
    if (form.communityId) return
    if (communities.length === 0) return
    const fallback = communities.find((item) => item.id === defaultCommunityId) ?? communities[0]
    setForm((previous) => ({
      ...previous,
      communityId: fallback.id,
      city: previous.city || fallback.city,
    }))
  }, [communities, defaultCommunityId, event, form.communityId])

  const save = useAction(
    (payload: EventPayload) => (event ? updateEvent(event.id, payload) : createEvent(payload)),
    {
      successMessage: editing ? 'Sesi diperbarui.' : 'Sesi dibuat.',
      onSuccess: (saved) => {
        onClose()
        onSaved(saved)
      },
    },
  )

  const submit = () => {
    const startsAt = fromDatetimeLocal(form.startsAt)
    const endsAt = fromDatetimeLocal(form.endsAt)
    void save.run({
      communityId: form.communityId,
      title: form.title.trim(),
      sport: form.sport,
      format: form.format,
      venue: form.venue.trim(),
      city: form.city.trim(),
      startsAt,
      endsAt,
      capacity: Number(form.capacity) || 0,
      fee: Number(form.fee) || 0,
      levelMin: Number(form.levelMin) || 1,
      levelMax: Number(form.levelMax) || 7,
      notes: form.notes.trim(),
      status: form.status,
    })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{editing ? 'Ubah sesi' : 'Buat sesi'}</DialogTitle>
        <DialogDescription>
          Waktu memakai zona waktu perangkatmu. Kapasitas doubles harus kelipatan 4,
          singles kelipatan 2.
        </DialogDescription>
      </DialogHeader>

      <form
        className="space-y-4"
        noValidate
        onSubmit={(formEvent) => {
          formEvent.preventDefault()
          submit()
        }}
      >
        {!editing ? (
          <>
          <SelectField
            label="Komunitas"
            required
            value={form.communityId}
            onChange={(input) => {
              const community = communities.find((item) => item.id === input.target.value)
              set('communityId', input.target.value)
              if (community && !form.city) set('city', community.city)
            }}
          >
            {communities.length === 0 ? <option value="">Tidak ada komunitas</option> : null}
            {communities.map((community) => (
              <option key={community.id} value={community.id}>
                {community.name} · {community.city}
              </option>
            ))}
          </SelectField>
          {communities.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Kamu belum punya komunitas.{' '}
              <a href="/komunitas" className="font-medium text-primary underline-offset-4 hover:underline">
                Buat komunitas dulu
              </a>
              .
            </p>
          ) : null}
          </>
        ) : (
          <p className="rounded-md border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
            Komunitas: <span className="font-medium text-foreground">{event?.communityName}</span>
          </p>
        )}

        <TextField
          label="Judul sesi"
          required
          value={form.title}
          onChange={(input) => set('title', input.target.value)}
          placeholder="Contoh: Sesi Rutin Padel Rabu"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Cabang olahraga"
            value={form.sport}
            onChange={(input) => set('sport', input.target.value as Sport)}
          >
            <option value="padel">Padel</option>
            <option value="tennis">Tenis</option>
          </SelectField>
          <SelectField
            label="Format"
            value={form.format}
            onChange={(input) => set('format', input.target.value as EventFormat)}
          >
            <option value="doubles">Doubles</option>
            <option value="singles">Singles</option>
          </SelectField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Lokasi"
            required
            value={form.venue}
            onChange={(input) => set('venue', input.target.value)}
            placeholder="Contoh: GOR Padel Buah Batu"
          />
          <TextField
            label="Kota"
            required
            value={form.city}
            onChange={(input) => set('city', input.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Mulai"
            type="datetime-local"
            required
            value={form.startsAt}
            onChange={(input) => set('startsAt', input.target.value)}
          />
          <TextField
            label="Selesai"
            type="datetime-local"
            required
            value={form.endsAt}
            onChange={(input) => set('endsAt', input.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <TextField
            label="Kapasitas"
            type="number"
            required
            min={2}
            value={form.capacity}
            onChange={(input) => set('capacity', input.target.value)}
          />
          <TextField
            label="Biaya per orang"
            type="number"
            min={0}
            step={5000}
            value={form.fee}
            onChange={(input) => set('fee', input.target.value)}
            hint="0 berarti gratis."
          />
          <SelectField
            label="Status"
            value={form.status}
            onChange={(input) => set('status', input.target.value)}
          >
            <option value="published">Terbit</option>
            <option value="draft">Draf</option>
          </SelectField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Level minimum"
            type="number"
            min={1}
            max={7}
            required
            value={form.levelMin}
            onChange={(input) => set('levelMin', input.target.value)}
          />
          <TextField
            label="Level maksimum"
            type="number"
            min={1}
            max={7}
            required
            value={form.levelMax}
            onChange={(input) => set('levelMax', input.target.value)}
          />
        </div>

        <TextAreaField
          label="Catatan"
          value={form.notes}
          onChange={(input) => set('notes', input.target.value)}
          placeholder="Informasi tambahan untuk peserta: parkir, bawa botol minum, dsb."
        />

        {save.error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {save.error}
          </p>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" disabled={save.pending || !form.communityId}>
            {save.pending ? 'Menyimpan...' : editing ? 'Simpan perubahan' : 'Buat sesi'}
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}
