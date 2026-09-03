import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .limit(1)

  if (error) {
    return NextResponse.json({
      connected: false,
      error: error.message,
    })
  }

  return NextResponse.json({
    connected: true,
    data,
  })
}