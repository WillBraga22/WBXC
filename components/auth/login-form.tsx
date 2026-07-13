'use client'

import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    setErrorMessage('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setStatus('error')
      setErrorMessage(error.message)
      return
    }

    setStatus('sent')
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center gap-4">
        <Image src="/logo-xc.svg" alt="XC" width={48} height={48} className="h-12 w-12" />
        <h1 className="text-xl font-semibold">Entrar no WBXC</h1>
      </div>

      {status === 'sent' ? (
        <p className="text-center text-sm text-muted">
          Enviamos um link de acesso para <strong className="text-foreground">{email}</strong>.
          Abra seu e-mail e clique no link para entrar.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            required
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 rounded-md border border-border bg-transparent px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          {status === 'error' && (
            <p className="text-sm text-red-400">{errorMessage}</p>
          )}
          <Button type="submit" loading={status === 'sending'}>
            Enviar link de acesso
          </Button>
        </form>
      )}
    </div>
  )
}
