'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import SearchOverlay from '@/components/SearchOverlay';
import { useCart } from '@/components/CartProvider';
import { useWishlist } from '@/components/WishlistProvider';

const BookingModal = dynamic(() => import('@/components/BookingModal'), { ssr: false });

// Single row of links rendered below the centred DANHOV logo.
// Product-category links use homepage hash anchors so the nav scrolls
// directly to the embedded product sections instead of navigating away.
const LINKS_ROW = [
  { href: '/', label: 'Home' },
  { href: '/engagement-rings', label: 'Engagement Rings' },
  { href: '/wedding-bands', label: 'Wedding Bands' },
  { href: '/fine-jewelry', label: 'Fine Jewelry' },
  { href: '/mens', label: "Men's" },
  { href: '/ring-builder', label: 'Ring Builder' },
  { href: '/philosophy', label: 'Philosophy' },
  { href: '/story', label: 'Story' },
];

function isActiveLink(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === '/') return pathname === '/';
  if (href.startsWith('/#')) return false;
  return pathname === href || pathname.startsWith(href + '/');
}

const LINKS = LINKS_ROW;

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const pathname = usePathname();
  const { count: cartCount, openDrawer } = useCart();
  const { slugs: wishlistSlugs } = useWishlist();
  const wishlistCount = wishlistSlugs.size;

  const phoneTel = process.env.NEXT_PUBLIC_PHONE_TEL || '+18883264687';

  // Close drawer on route change; also blur any focused nav element so
  // the hover-reveal collapses when the cursor leaves after navigation.
  useEffect(() => {
    setOpen(false);
    setSearchOpen(false);
    setBookingOpen(false);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, [pathname]);

  // When already on the homepage, intercept hash-anchor clicks and smooth-scroll
  // directly to the section instead of letting Next.js navigate to "/" first.
  // Blur the element immediately so :focus-within collapses the nav on mouse-out.
  const handleHashScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('/#') && pathname === '/') {
      e.preventDefault();
      const id = href.slice(2);
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      (e.currentTarget as HTMLElement).blur();
    }
  };

  // Lock body scroll while drawer, search, or booking modal is open
  useEffect(() => {
    if (open || searchOpen || bookingOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open, searchOpen, bookingOpen]);

  // Close on Escape
  useEffect(() => {
    if (!open && !searchOpen && !bookingOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setSearchOpen(false);
        setBookingOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, searchOpen, bookingOpen]);

  return (
    <>
      <nav className="site-nav site-nav--stacked" aria-label="Main navigation">

        {/* Top row: DANHOV logo centred · icons right */}
        <div className="nav-logo-row">
          <Link href="/" className="nav-logo nav-glow-frame" aria-label="DANHOV — Home">
            <Image
              src="/danhov-logo-transparent.png"
              alt="DANHOV"
              width={170}
              height={38}
              priority
            />
          </Link>

          {/* Right-side action cluster — VM, search, phone, account, wishlist, cart */}
          <div className="nav-actions">
            <button
              type="button"
              className="nav-vm-btn"
              aria-label="Book a virtual meeting"
              onClick={() => setBookingOpen(true)}
            >
              <VideoIcon />
              <span>Virtual Meeting</span>
            </button>
            <button
              type="button"
              className="nav-icon-btn nav-glow-frame"
              aria-label="Search"
              onClick={() => setSearchOpen(true)}
            >
              <SearchIcon />
            </button>
            <a
              href={`tel:${phoneTel}`}
              className="nav-icon-btn nav-glow-frame"
              aria-label="Call the atelier"
            >
              <PhoneIcon />
            </a>
            <Link href="/account" className="nav-icon-btn nav-glow-frame" aria-label="Account">
              <AccountIcon />
            </Link>
            <Link href="/wishlist" className="nav-icon-btn nav-glow-frame nav-wishlist-btn" aria-label={wishlistCount > 0 ? `Wishlist, ${wishlistCount} saved` : 'Wishlist'}>
              <WishlistIcon />
              {wishlistCount > 0 && (
                <span className="nav-cart-badge" aria-hidden="true">{wishlistCount}</span>
              )}
            </Link>
            <button
              type="button"
              className="nav-icon-btn nav-glow-frame nav-cart-btn"
              aria-label={cartCount > 0 ? `Cart, ${cartCount} item${cartCount === 1 ? '' : 's'}` : 'Cart, empty'}
              onClick={openDrawer}
            >
              <CartIcon />
              {cartCount > 0 && (
                <span className="nav-cart-badge" aria-hidden="true">{cartCount > 99 ? '99+' : cartCount}</span>
              )}
            </button>
          </div>

          {/* Mobile hamburger — only visible on small screens */}
          <button
            type="button"
            className={`nav-burger${open ? ' is-open' : ''}`}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-drawer"
            onClick={() => setOpen((o) => !o)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        {/* Links — bottom row, centred, with active-page underline */}
        <ul className="nav-links nav-links-row">
          {LINKS_ROW.map((l) => {
            const active = isActiveLink(pathname, l.href);
            return (
              <li key={l.label}>
                <Link
                  href={l.href}
                  prefetch
                  className={active ? 'is-active' : undefined}
                  aria-current={active ? 'page' : undefined}
                  onClick={(e) => handleHashScroll(e, l.href)}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mega-overlay" aria-hidden="true" />

      {/* Mobile drawer */}
      <div
        id="mobile-drawer"
        className={`nav-drawer${open ? ' is-open' : ''}`}
        aria-hidden={!open}
        role="dialog"
        aria-label="Site menu"
      >
        <ul className="nav-drawer-links">
          {LINKS.map((l) => (
            <li key={l.label}>
              <Link
                href={l.href}
                onClick={(e) => {
                  handleHashScroll(e, l.href);
                  setOpen(false);
                }}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="nav-cta nav-drawer-cta nav-drawer-vm"
          onClick={() => { setOpen(false); setBookingOpen(true); }}
        >
          <VideoIcon />
          Virtual Meeting
        </button>
        <Link
          href="/#appointment"
          className="nav-cta nav-drawer-cta"
          onClick={() => setOpen(false)}
        >
          Book Appointment
        </Link>
        <a
          href={`tel:${phoneTel}`}
          className="nav-drawer-call"
          onClick={() => setOpen(false)}
        >
          1 (888) DANHOV-7
        </a>
      </div>

      {/* Scrim — closes the drawer when tapped */}
      <div
        className={`nav-scrim${open ? ' is-open' : ''}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Site-wide search overlay */}
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Virtual Meeting — Calendly/Zoom booking modal */}
      <BookingModal open={bookingOpen} onClose={() => setBookingOpen(false)} />
    </>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function WishlistIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 5h2.2l2.6 11.4a2 2 0 0 0 2 1.6h7.4a2 2 0 0 0 2-1.6L21.5 8H7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="20.5" r="1.4" fill="currentColor" />
      <circle cx="18" cy="20.5" r="1.4" fill="currentColor" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="6" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M16 10l6-4v12l-6-4V10Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

