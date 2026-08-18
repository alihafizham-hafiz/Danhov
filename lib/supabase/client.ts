import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

// Singleton — multiple components (CartProvider, AuthForm, AdminShell, ...)
// each call createClient() independently. createBrowserClient() must only
// be instantiated once per browser context; calling it repeatedly creates
// separate GoTrueClient instances that fight over the same localStorage
// auth-token key (visible as a "Multiple GoTrueClient instances detected"
// console warning).
let cached: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  if (cached) return cached;
  cached = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
  return cached;
}
