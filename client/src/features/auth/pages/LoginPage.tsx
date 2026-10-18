import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '@/app/auth'
import { Button } from '@/shared/components/ui/button'
import { TextField } from '@/shared/components/FormField'
import { useAction } from '@/shared/hooks/useAction'
import { AuthLayout } from '../components/AuthLayout'

type LocationState = { from?: string } | null

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const signInAction = useAction(signIn, {
    onSuccess: () => {
      const state = location.state as LocationState
      navigate(state?.from ?? '/app', { replace: true })
    },
  })

  return (
    <AuthLayout
      eyebrow="Masuk"
      title="Lanjutkan sesi"
      description="Masuk untuk melihat jadwal, mengabsen pemain, dan mengisi skor."
      footer={
        <>
          Belum punya akun?{' '}
          <Link to="/daftar" className="font-medium text-primary underline-offset-4 hover:underline">
            Daftar di sini
          </Link>
        </>
      }
    >
      <form
        className="space-y-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void signInAction.run(email.trim(), password)
        }}
      >
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="nama@contoh.id"
        />
        <TextField
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={signInAction.error || undefined}
        />
        <Button type="submit" className="w-full" disabled={signInAction.pending}>
          {signInAction.pending ? 'Memeriksa...' : 'Masuk'}
        </Button>
      </form>

      <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
        Untuk mencoba data contoh, pakai <span className="font-medium text-foreground">rani@rallyup.test</span>{' '}
        dengan password <span className="font-medium text-foreground">rallyup123</span>. Akun contoh lain memakai
        password yang sama.
      </p>
    </AuthLayout>
  )
}
