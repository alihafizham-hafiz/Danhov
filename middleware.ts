import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { resolveLegacyRedirect } from '@/lib/resolve-legacy-redirect';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Protects /admin/* routes. If the visitor isn't authenticated, redirect
 * to /admin/login. (We do the more thorough admin_users check inside the
 * route handlers via requireAdmin() — the middleware just gates auth.)
 *
 * Also refreshes the Supabase session cookie on every request so admin
 * sessions stay valid.
 */
export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Legacy-URL redirects run first and skip the Supabase session work
  // entirely — these paths are never valid app routes.
  const legacyTarget = resolveLegacyRedirect(path);
  if (legacyTarget) {
    const url = req.nextUrl.clone();
    const [targetPath, targetQuery] = legacyTarget.split('?');
    url.pathname = targetPath;
    url.search = targetQuery ? `?${targetQuery}` : '';
    return NextResponse.redirect(url, 308);
  }

  // Expose the pathname to server components via a request header so the
  // root layout can conditionally skip the public-site chrome on /admin/*.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-pathname', req.nextUrl.pathname);
  const res = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set({ name, value, ...options });
          });
        },
      },
    }
  );

  // Force a refresh of the session if it's expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect /admin/* (except /admin/login itself)
  if (path.startsWith('/admin') && path !== '/admin/login') {
    if (!user) {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/login';
      url.searchParams.set('next', path);
      return NextResponse.redirect(url);
    }
  }

  // If already signed in and hitting /admin/login, push to dashboard
  if (path === '/admin/login' && user) {
    const url = req.nextUrl.clone();
    url.pathname = '/admin';
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ['/admin/:path*', '/home', '/ringbuilder/:path*', '/danhov-:path*'],
};
