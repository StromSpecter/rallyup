import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '@/app/auth'
import { Button } from '@/shared/components/ui/button'
import { TextField } from '@/shared/components/FormField'
import { useAction } from '@/shared/hooks/useAction'
import { AuthLayout } from '../components/AuthLayout'

export function RegisterPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const signUpAction = useAction(signUp, {
    onSuccess: () => navigate('/app', { replace: true }),
  })

  return (
    <AuthLayout
      eyebrow="Daftar"
      title="Buat akun pemain"
      description="Satu akun untuk gabung komunitas, ikut sesi, dan menyimpan rating di tiap komunitas."
      footer={
        <>
          Sudah punya akun?{' '}
          <Link to="/masuk" className="font-medium text-primary underline-offset-4 hover:underline">
            Masuk saja
          </Link>
        </>
      }
    >
      <form
        className="space-y-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void signUpAction.run(name.trim(), email.trim(), password)
        }}
      >
        <TextField
          label="Nama"
          name="name"
          autoComplete="name"
          required
          minLength={2}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nama yang tampil di daftar peserta"
        />
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
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          hint="Minimal 8 karakter."
          error={signUpAction.error || undefined}
        />
        <Button type="submit" className="w-full" disabled={signUpAction.pending}>
          {signUpAction.pending ? 'Membuat akun...' : 'Daftar'}
        </Button>
      </form>
    </AuthLayout>
  )
}
