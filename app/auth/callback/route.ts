import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  console.log('========== CALLBACK ==========')
  console.log(request.url)

  const code = searchParams.get('code')
  console.log('CODE:', code)

  if (!code) {
    return NextResponse.json({
      error: 'Sem código',
      url: request.url,
    })
  }

  const supabase = await createClient()

  const result = await supabase.auth.exchangeCodeForSession(code)

  console.log(result)

  return NextResponse.json(result)
}
