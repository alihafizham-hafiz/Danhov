'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import type { AdminUser } from '@/lib/admin-auth';

const NAV: { href: string; label: string; icon: React.ReactNode }[] = [
  { href: '/admin', label: 'Dashboard', icon: <DashIcon /> },
  { href: '/admin/accounting', label: 'Accounting', icon: <ChartIcon /> },
  { href: '/admin/products', label: 'Products', icon: <RingIcon /> },
  { href: '/admin/diamonds', label: 'Diamonds', icon: <DiamondIcon /> },
  { href: '/admin/orders', label: 'Orders', icon: <CartIcon /> },
  { href: '/admin/customers', label: 'Customers', icon: <UserIcon /> },
  { href: '/admin/consultations', label: 'Consultations', icon: <CalendarIcon /> },
  { href: '/admin/affiliates', label: 'Affiliates', icon: <AffIcon /> },
  { href: '/admin/content', label: 'Page Content', icon: <DocIcon /> },
  { href: '/admin/ai', label: 'AI Assistant', icon: <AIIcon /> },
  { href: '/admin/settings', label: 'Settings', icon: <CogIcon /> },
];

export default function AdminShell({
  admin,
  children,
}: {
  admin: AdminUser;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function openNav() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setNavOpen(true);
  }

  function scheduleClose() {
    closeTimer.current = setTimeout(() => setNavOpen(false), 120);
  }

  async function signOut() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <div className="adm-shell">

      {/* Fly-in sidebar */}
      <aside
        className={`adm-sidebar${navOpen ? ' is-open' : ''}`}
        onMouseEnter={openNav}
        onMouseLeave={scheduleClose}
      >
        <Link href="/admin" className="adm-brand" onClick={() => setNavOpen(false)}>
          <Image
            src="/danhov-logo-transparent.png"
            alt="Danhov"
            width={150}
            height={23}
            style={{ objectFit: 'contain' }}
            priority
          />
          <span className="adm-brand-sub">Admin Atelier</span>
        </Link>
        <nav className="adm-nav" aria-label="Admin navigation">
          {NAV.map((n) => {
            const active =
              n.href === '/admin'
                ? path === '/admin'
                : path?.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`adm-navlink${active ? ' is-active' : ''}`}
                onClick={() => setNavOpen(false)}
              >
                <span className="adm-navlink-icon">{n.icon}</span>
                <span>{n.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="adm-sidebar-foot">
          <Link href="/" className="adm-back" target="_blank">
            View Site ↗
          </Link>
        </div>
      </aside>

      {/* Scrim */}
      {navOpen && (
        <div
          className="adm-scrim is-open"
          onClick={() => setNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Header */}
      <header className="adm-header">
        <button
          type="button"
          className={`adm-burger${navOpen ? ' is-open' : ''}`}
          aria-label={navOpen ? 'Close navigation' : 'Open navigation'}
          onMouseEnter={openNav}
          onMouseLeave={scheduleClose}
        >
          <span /><span /><span />
        </button>
        <Link href="/admin" className="adm-header-brand">
          <Image
            src="/danhov-logo-transparent.png"
            alt="Danhov"
            width={110}
            height={20}
            style={{ objectFit: 'contain' }}
            priority
          />
        </Link>
        <div className="adm-header-spacer" />
        <div className="adm-user">
          <span className="adm-user-email">{admin.email}</span>
          <button type="button" className="adm-signout" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      <main className="adm-main">{children}</main>
    </div>
  );
}

// ── icons ────────────────────────────────────────────────────────────────
function DashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z" fill="currentColor" />
    </svg>
  );
}
function RingIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="14" r="6" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 8l4-4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function CartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M3 3h2l3 13h11l2-8H7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="20" r="1.5" fill="currentColor" />
      <circle cx="18" cy="20" r="1.5" fill="currentColor" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function DocIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M6 3h9l4 4v14H6V3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M14 3v5h5M9 13h6M9 17h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M3 21h18M5 21V10m4 11V6m4 15v-9m4 9V3m4 18v-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function CogIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}
function AffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}
function DiamondIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M2 7.5L5.5 3H14.5L18 7.5L10 17.5L2 7.5Z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
      <path d="M2 7.5H18M5.5 3L10 7.5L14.5 3" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
    </svg>
  );
}
function AIIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 2a4 4 0 0 1 4 4v1h1a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V10a3 3 0 0 1 3-3h1V6a4 4 0 0 1 4-4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="9" cy="13" r="1.2" fill="currentColor" />
      <circle cx="15" cy="13" r="1.2" fill="currentColor" />
      <path d="M9 17c.8.7 1.7 1 3 1s2.2-.3 3-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
