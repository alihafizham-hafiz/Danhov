/**
 * Admin auth helpers.
 *
 * - requireAdmin(): redirect to /admin/login if not signed in or not in
 *   admin_users.
 * - getAdmin(): returns the admin user or null (no redirect).
 *
 * Server-only — uses cookies via @supabase/ssr.
 */

import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export type AdminUser = {
  id: string;
  email: string;
};

export async function getAdmin(): Promise<AdminUser | null> {
  // Step 1 — read the current user from the cookie session.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Step 2 — look up admin status with the service-role client so the
  // lookup isn't subject to RLS on admin_users (Supabase's default for a
  // newly-created table is "RLS on, no policies → reads blocked"). We've
  // already verified the session above, so using elevated access for this
  // single lookup is safe and removes a fragile manual-policy requirement.
  const admin = createServiceClient();
  const { data: row } = await admin
    .from('admin_users')
    .select('user_id, email')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!row) return null;
  return { id: row.user_id as string, email: row.email as string };
}

export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdmin();
  if (!admin) redirect('/admin/login');
  return admin;
}
