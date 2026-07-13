import { createBrowserClient } from '@supabase/ssr'

/**
 * Cliente Supabase para Client Components.
 * Uso: const supabase = createClient() dentro do componente.
 *
 * Nota: sem tipagem genérica <Database> por enquanto — o placeholder em
 * types/database.ts usava uma index signature que fazia o TypeScript
 * inferir "never" pras linhas das tabelas e quebrava o build. Assim que
 * gerar os tipos reais (ver types/database.ts), volte a tipar aqui.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
