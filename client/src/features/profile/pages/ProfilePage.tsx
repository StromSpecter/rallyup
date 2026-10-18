import { useState } from 'react'
import { FiCheck, FiLogOut } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/app/auth'
import { Avatar } from '@/shared/components/Avatar'
import { Container, Eyebrow } from '@/shared/components/Container'
import { TextField } from '@/shared/components/FormField'
import { PageHeader } from '@/shared/components/PageHeader'
import { Button } from '@/shared/components/ui/button'
import { useAction } from '@/shared/hooks/useAction'
import { AVATAR_COLORS } from '@/shared/lib/constants'
import { formatDateFull } from '@/shared/lib/format'

export function ProfilePage() {
  const { user, updateProfile, signOut } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState(user?.name ?? '')
  const [avatarColor, setAvatarColor] = useState(user?.avatarColor ?? AVATAR_COLORS[0].value)

  const save = useAction(
    (input: { name: string; avatarColor: string }) => updateProfile(input),
    { successMessage: 'Profil disimpan.' },
  )

  const handleSignOut = async () => {
    await signOut()
    navigate('/', { replace: true })
  }

  if (!user) {
    return null
  }

  const trimmed = name.trim()
  const changed = trimmed !== user.name || avatarColor !== user.avatarColor
  const nameError = trimmed.length > 0 && trimmed.length < 2 ? 'Nama minimal 2 karakter.' : ''

  return (
    <Container className="max-w-3xl py-8">
      <PageHeader
        eyebrow="Akun"
        title="Profil"
        description="Nama dan warna avatar ini yang tampil di daftar peserta dan papan peringkat."
      />

      <div className="grid gap-8 sm:grid-cols-[auto_1fr]">
        <aside className="flex flex-col items-center gap-3">
          <Avatar name={trimmed || user.name} color={avatarColor} size="xl" />
          <div className="text-center">
            <p className="font-display text-lg uppercase">{trimmed || user.name}</p>
            <p className="text-xs text-muted-foreground">
              Bergabung {formatDateFull(user.createdAt)}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void handleSignOut()}>
            <FiLogOut aria-hidden="true" />
            Keluar
          </Button>
        </aside>

        <form
          className="space-y-6"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            if (nameError || !trimmed) return
            void save.run({ name: trimmed, avatarColor })
          }}
        >
          <TextField
            label="Nama tampilan"
            required
            minLength={2}
            value={name}
            error={nameError}
            onChange={(event) => setName(event.target.value)}
            hint="Nama ini dipakai di seluruh komunitas."
          />

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Warna avatar</span>
            <div role="group" aria-label="Warna avatar" className="flex flex-wrap gap-2">
              {AVATAR_COLORS.map((color) => {
                const selected = color.value === avatarColor
                return (
                  <button
                    key={color.value}
                    type="button"
                    aria-pressed={selected}
                    aria-label={color.label}
                    title={color.label}
                    onClick={() => setAvatarColor(color.value)}
                    className={[
                      'flex size-10 items-center justify-center rounded-full border-2 transition-transform',
                      selected ? 'border-foreground' : 'border-transparent hover:scale-105',
                    ].join(' ')}
                    style={{ backgroundColor: color.value, color: '#F4F1E9' }}
                  >
                    {selected ? <FiCheck aria-hidden="true" className="size-4" /> : null}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Warna hanya dipakai sebagai latar inisial, bukan foto profil.
            </p>
          </div>

          <div className="space-y-1.5">
            <Eyebrow>Email</Eyebrow>
            <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
              {user.email}
            </p>
            <p className="text-xs text-muted-foreground">
              Email dipakai untuk masuk dan tidak bisa diubah dari halaman ini.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={save.pending || !changed || Boolean(nameError)}>
              {save.pending ? 'Menyimpan...' : 'Simpan perubahan'}
            </Button>
            {changed ? (
              <Button
                type="button"
                variant="ghost"
                disabled={save.pending}
                onClick={() => {
                  setName(user.name)
                  setAvatarColor(user.avatarColor)
                }}
              >
                Batalkan perubahan
              </Button>
            ) : (
              <span className="text-sm text-muted-foreground">Belum ada perubahan.</span>
            )}
          </div>
        </form>
      </div>
    </Container>
  )
}
