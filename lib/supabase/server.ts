import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll in server components — safe to ignore
          }
        },
      },
    }
  );
}

/**
 * Service-role client — server-side only, bypasses RLS.
 * Use for seed scripts, admin operations, webhook handlers.
 *
 * Accepts either SUPABASE_SECRET_KEY (legacy) or
 * SUPABASE_SERVICE_ROLE_KEY (the name Vercel + Supabase docs use).
 * Throws a clear error if neither is set.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY;
  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  }
  if (!key) {
    throw new Error(
      'Missing Supabase service-role key. Set SUPABASE_SERVICE_ROLE_KEY (or legacy SUPABASE_SECRET_KEY) in your environment.'
    );
  }
  return createSupabaseJsClient(url, key, { auth: { persistSession: false } });
}
