import { useState } from 'react'

import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { TextAreaField, TextField } from '@/shared/components/FormField'
import { createCommunity } from '@/shared/api/communities'
import { useAction } from '@/shared/hooks/useAction'
import type { Community } from '@/shared/types/api'

type CreateCommunityDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (community: Community) => void
}

export function CreateCommunityDialog({ open, onOpenChange, onCreated }: CreateCommunityDialogProps) {
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [description, setDescription] = useState('')

  const create = useAction(
    (payload: { name: string; city: string; description: string }) =>
      createCommunity(payload),
    {
      successMessage: 'Komunitas dibuat. Kamu jadi pemiliknya.',
      onSuccess: (community) => {
        onOpenChange(false)
        setName('')
        setCity('')
        setDescription('')
        onCreated(community)
      },
    },
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Buat komunitas</DialogTitle>
          <DialogDescription>
            Komunitas adalah tempat sesi dijadwalkan. Kamu otomatis menjadi pemilik dan
            bisa menunjuk moderator.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            void create.run({ name: name.trim(), city: city.trim(), description: description.trim() })
          }}
        >
          <TextField
            label="Nama komunitas"
            required
            minLength={3}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Contoh: Padel Bandung Selatan"
          />
          <TextField
            label="Kota"
            required
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="Contoh: Bandung"
          />
          <TextAreaField
            label="Deskripsi"
            hint="Ceritakan jadwal rutin, lokasi, atau level pemain yang cocok."
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          {create.error ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {create.error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={create.pending}>
              {create.pending ? 'Menyimpan...' : 'Buat komunitas'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
