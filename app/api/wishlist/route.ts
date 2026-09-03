import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/wishlist — return slugs the signed-in user has saved
export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ slugs: [] });

  const { data } = await sb
    .from('wishlists')
    .select('product_slug')
    .eq('user_id', user.id);

  return NextResponse.json({ slugs: (data ?? []).map((r: { product_slug: string }) => r.product_slug) });
}

// POST /api/wishlist — toggle (add or remove) a product slug
export async function POST(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in to save pieces to your wishlist.' }, { status: 401 });

  const { slug } = await req.json();
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });

  // Check if already wishlisted
  const { data: existing } = await sb
    .from('wishlists')
    .select('id')
    .eq('user_id', user.id)
    .eq('product_slug', slug)
    .maybeSingle();

  if (existing) {
    await sb.from('wishlists').delete().eq('id', existing.id);
    return NextResponse.json({ saved: false });
  } else {
    await sb.from('wishlists').insert({ user_id: user.id, product_slug: slug });
    return NextResponse.json({ saved: true });
  }
}
