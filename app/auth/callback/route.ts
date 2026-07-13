import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)

  console.log('=== CALLBACK EXECUTADO ===')
  console.log('URL:', request.url)

  const code = searchParams.get('code')
  console.log('CODE:', code)

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  console.log('DATA:', data)
  console.log('ERROR:', error)

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    )
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}
