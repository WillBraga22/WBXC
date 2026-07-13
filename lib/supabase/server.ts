import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { CookieOptions } from '@supabase/ssr'

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 * Precisa ser recriado a cada request (por causa dos cookies).
 *
 * Nota: sem tipagem genérica <Database> por enquanto — ver client.ts.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Chamado de um Server Component — ignorado com segurança
            // quando há middleware renovando a sessão.
          }
        },
      },
    }
  )
}
