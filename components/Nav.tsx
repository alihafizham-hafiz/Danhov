'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import SearchOverlay from '@/components/SearchOverlay';
import AnnouncementBar from '@/components/AnnouncementBar';
import { useCart } from '@/components/CartProvider';
import { useWishlist } from '@/components/WishlistProvider';
import { MENS_ENABLED } from '@/lib/feature-flags';
import { supabaseAnon } from '@/lib/supabase/anon';

const BookingModal = dynamic(() => import('@/components/BookingModal'), { ssr: false });

// Mega Menu Types
interface MegaMenuColumn {
  title: string;
  items: { label: string; href: string }[];
}

interface PromoCard {
  image: string;
  title: string;
  href: string;
}

interface StandardMegaContent {
  type: 'standard';
  columns: MegaMenuColumn[];
  promo?: PromoCard;
}

interface CardsMegaContent {
  type: 'cards';
  tabs?: string[]; // For sub-tabs if applicable
  cards: { image: string; title: string; href: string }[];
  footerText?: {
    text: string;
    linkText: string;
    href: string;
  };
}

type MegaMenuContent = StandardMegaContent | CardsMegaContent;

interface NavLinkItem {
  href: string;
  label: string;
  sub?: string;
  megaMenu?: MegaMenuContent;
}

// ==========================================
// MEGA MENU DATA DEFINITIONS (DANHOV BRANDED)
// ==========================================

// 1. Engagement Rings Mega Menu (Style with 6 Grid Cards + Footer Callout)
const ENGAGEMENT_RINGS_MEGA: CardsMegaContent = {
  type: 'cards',
  cards: [
    { image: '/RINGS-1X/product-1.png', title: 'Ring', href: '/engagement-rings/'},
    { image: '/RINGS-1X/product-2.png', title: 'Ring', href: '/engagement-rings/' },
    { image: '/RINGS-1X/product-3.png', title: 'Ring', href: '/engagement-rings/' },
    { image: '/RINGS-1X/product-3.png', title: 'Ring', href: '/engagement-rings/' },
    { image: '/RINGS-1X/product-4.png', title: 'Ring', href: '/engagement-rings/' },
    { image: '/RINGS-1X/product-5.png', title: 'How to Choose an Engagement Ring', href: '/engagement-rings/' },
  ],
  footerText: {
    text: 'Book Your Appointment with a DANHOV Diamond Expert, or Explore Our',
    linkText: 'Guide to Diamonds.',
    href: '/guide-to-diamonds',
  },
};

const buildDynamicMegaItems = (
  primary: { label: string; href: string }[],
  secondary: { label: string; href: string }[] = [],
  featured: { label: string; href: string }[] = [],
  promoImage: string,
  promoTitle: string,
  promoHref: string
): StandardMegaContent => ({
  type: 'standard',
  columns: [
    { title: 'Collections', items: primary },
    ...(secondary.length ? [{ title: 'Featured', items: secondary }] : []),
    ...(featured.length ? [{ title: 'More Styles', items: featured }] : []),
  ],
  promo: {
    image: promoImage,
    title: promoTitle,
    href: promoHref,
  },
});

const WEDDING_BANDS_MEGA: StandardMegaContent = buildDynamicMegaItems(
  [
    { label: 'Classic Wedding Bands', href: '/wedding-bands' },
    { label: 'Diamond Wedding Bands', href: '/wedding-bands' },
    { label: 'Gold Wedding Bands', href: '/wedding-bands' },
    { label: 'Rose Gold Wedding Bands', href: '/wedding-bands' },
    { label: 'Slim Wedding Bands', href: '/wedding-bands' },
  ],
  [
    { label: 'His & Hers Sets', href: '/wedding-bands' },
    { label: 'Stacking Bands', href: '/wedding-bands' },
    { label: 'Engraved Bands', href: '/wedding-bands' },
    { label: 'Matching Styles', href: '/wedding-bands' },
  ],
  [
    { label: 'Wedding Band Guide', href: '/wedding-bands' },
    { label: 'Shop All Wedding Bands', href: '/wedding-bands' },
  ],
  '/RINGS-1X/product-book.png',
  'Explore Wedding Bands',
  '/wedding-bands'
);

const FINE_JEWELRY_MEGA: StandardMegaContent = buildDynamicMegaItems(
  [
    { label: 'Rings', href: '/fine-jewelry' },
    { label: 'Necklaces', href: '/fine-jewelry' },
    { label: 'Earrings', href: '/fine-jewelry' },
    { label: 'Bracelets', href: '/fine-jewelry' },
    { label: 'Pendants', href: '/fine-jewelry' },
  ],
  [
    { label: 'New Arrivals', href: '/fine-jewelry' },
    { label: 'Most Loved', href: '/fine-jewelry' },
    { label: 'Gold Jewelry', href: '/fine-jewelry' },
    { label: 'Diamond Jewelry', href: '/fine-jewelry' },
  ],
  [
    { label: 'Shop All Fine Jewelry', href: '/fine-jewelry' },
    { label: 'Men\'s Jewelry', href: '/mens' },
  ],
  '/RINGS-1X/product-bok.png',
  'Discover Fine Jewelry',
  '/fine-jewelry'
);

// 4. Watches / Additional Nav Item Mega Menu (Shop By Category / Strap / Curated Shops)
const WATCHES_MEGA: StandardMegaContent = {
  type: 'standard',
  columns: [
    {
      title: 'Shop By Category',
      items: [
        { label: "Women’s Watches", href: '/watches/womens' },
        { label: "Men’s Watches", href: '/watches/mens' },
        { label: 'Patek Philippe', href: '/watches/patek-philippe' },
        { label: 'All Fine Watches', href: '/watches/all' },
      ],
    },
    {
      title: 'Curated Shops',
      items: [
        { label: 'DANHOV Blue Watches', href: '/watches/danhov-blue' },
        { label: 'Diamond Watches', href: '/watches/diamond' },
        { label: 'Gold Watches', href: '/watches/gold' },
        { label: 'Stainless Steel Watches', href: '/watches/stainless-steel' },
        { label: 'Time Objects', href: '/watches/time-objects' },
      ],
    },
    {
      title: 'Shop By Collection',
      items: [
        { label: 'DANHOV HardWear', href: '/watches/hardwear' },
        { label: 'DANHOV Eternity', href: '/watches/eternity' },
        { label: 'Union Square', href: '/watches/union-square' },
        { label: 'Atlas', href: '/watches/atlas' },
        { label: 'DANHOV Rope', href: '/watches/rope' },
      ],
    },
  ],
  promo: {
    image: '/images/watch-promo.jpg',
    title: 'Shop Now',
    href: '/watches',
  },
};

export const NAV_CATEGORY_DB_SLUGS = {
  '/engagement-rings': 'engagement',
  '/wedding-bands': 'wedding',
  '/fine-jewelry': 'fine',
  '/mens': 'mens',
} as const;

export function getDbCategoryFromNavHref(href: string): string | null {
  const normalized = href.replace(/\/+$/, '');
  return NAV_CATEGORY_DB_SLUGS[normalized as keyof typeof NAV_CATEGORY_DB_SLUGS] ?? null;
}

const LINKS_ROW: NavLinkItem[] = [
  { href: '/', label: 'Home' },
  { href: '/engagement-rings', label: 'Engagement Rings', megaMenu: ENGAGEMENT_RINGS_MEGA },
  { href: '/wedding-bands', label: 'Wedding Bands', megaMenu: WEDDING_BANDS_MEGA },
  { href: '/fine-jewelry', label: 'Fine Jewelry', megaMenu: FINE_JEWELRY_MEGA },
  ...(MENS_ENABLED ? [{ href: '/mens', label: "Men's Jewelry" }] : []),
  { href: '/ring-builder', label: 'Build Your Ring', megaMenu: WATCHES_MEGA },
  { href: '/philosophy', label: 'Philosophy' },
  { href: '/story', label: 'Story' },
];

function isActiveLink(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === '/') return pathname === '/';
  if (href.startsWith('/#')) return false;
  return pathname === href || pathname.startsWith(href + '/');
}

function buildDbMegaMenu(
  title: string,
  label: string,
  items: { label: string; href: string }[],
  promoImage: string,
  promoTitle: string,
  promoHref: string
): StandardMegaContent {
  const primary = items.slice(0, 5);
  const secondary = items.slice(5, 10);
  const featured = items.slice(10, 14);

  return {
    type: 'standard',
    columns: [
      { title, items: primary },
      ...(secondary.length ? [{ title: label, items: secondary }] : []),
      ...(featured.length ? [{ title: 'More styles', items: featured }] : []),
    ],
    promo: {
      image: promoImage,
      title: promoTitle,
      href: promoHref,
    },
  };
}

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeMegaMenu, setActiveMegaMenu] = useState<MegaMenuContent | null>(null);
  const [dynamicMegaMenus, setDynamicMegaMenus] = useState<{
    wedding: StandardMegaContent | null;
    fine: StandardMegaContent | null;
  }>({ wedding: null, fine: null });
  const [mobilePane, setMobilePane] = useState<'main' | 'submenu'>('main');
  const [mobileTitle, setMobileTitle] = useState('Menu');
  const [mobileItems, setMobileItems] = useState<{ label: string; href: string }[]>([]);

  const pathname = usePathname();
  const headerRef = useRef<HTMLElement | null>(null);
  const leftClusterRef = useRef<HTMLDivElement | null>(null);
  const actionsClusterRef = useRef<HTMLDivElement | null>(null);
  
  const { count: cartCount, openDrawer } = useCart();
  const { slugs: wishlistSlugs } = useWishlist();
  const wishlistCount = wishlistSlugs.size;
  const isHome = pathname === '/';
  
  const phoneTel = process.env.NEXT_PUBLIC_PHONE_TEL || '+14244214072';
  const phoneDisplay = process.env.NEXT_PUBLIC_PHONE_DISPLAY || '(424) 421-4072';

  useEffect(() => {
    const loadDynamicMegaMenus = async () => {
      const { data, error } = await supabaseAnon
        .from('products')
        .select('collection, category, categories, slug, is_active')
        .eq('is_active', true);

      if (error || !data) return;

      const normalizeText = (value: string | null | undefined) =>
        (value ?? '').trim();

      const toMegaItem = (label: string, href: string) => ({
        label,
        href,
      });

      const byCategory = (target: string) =>
        data.filter((product) => {
          const categories = Array.isArray(product.categories) ? product.categories : [];
          const categoryValue = normalizeText(product.category).toLowerCase();
          const rawCategories = categories.map((item) => String(item).toLowerCase());
          return rawCategories.includes(target.toLowerCase()) || categoryValue === target.toLowerCase();
        });

      const buildCollectionLinks = (target: string, route: string) => {
        const rows = byCategory(target)
          .map((product) => normalizeText(product.collection))
          .filter(Boolean)
          .filter((value, index, arr) => arr.indexOf(value) === index)
          .slice(0, 12)
          .map((collection) => toMegaItem(collection, `${route}?collection=${encodeURIComponent(collection)}`));

        return rows.length ? rows : [{ label: 'Shop All', href: route }];
      };

      const weddingItems = buildCollectionLinks('wedding', '/wedding-bands');
      const fineItems = buildCollectionLinks('fine', '/fine-jewelry');

      const nextWedding = buildDbMegaMenu(
        'Collections',
        'More wedding styles',
        weddingItems,
        '/RINGS-1X/product-book.png',
        'Explore Wedding Bands',
        '/wedding-bands'
      );

      const nextFine = buildDbMegaMenu(
        'Collections',
        'More fine jewelry',
        fineItems,
        '/RINGS-1X/product-bok.png',
        'Discover Fine Jewelry',
        '/fine-jewelry'
      );

      setDynamicMegaMenus({ wedding: nextWedding, fine: nextFine });
    };

    loadDynamicMegaMenus();
  }, []);

  const resolveMegaMenu = (label: string): MegaMenuContent | null => {
    if (label === 'Wedding Bands') return dynamicMegaMenus.wedding ?? WEDDING_BANDS_MEGA;
    if (label === 'Fine Jewelry') return dynamicMegaMenus.fine ?? FINE_JEWELRY_MEGA;
    return null;
  };

  const getMenuForLink = (link: NavLinkItem) => {
    if (link.label === 'Wedding Bands') return resolveMegaMenu(link.label);
    if (link.label === 'Fine Jewelry') return resolveMegaMenu(link.label);
    return link.megaMenu ?? null;
  };

  const flattenMegaItems = (menu: MegaMenuContent | null) => {
    if (!menu) return [];

    const seen = new Set<string>();
    const addItem = (item: { label: string; href: string }) => {
      const signature = `${item.label.trim()}::${item.href.trim()}`;
      if (seen.has(signature)) return null;
      seen.add(signature);
      return { label: item.label.trim(), href: item.href.trim() };
    };

    if (menu.type === 'standard') {
      return menu.columns.flatMap((column) =>
        column.items
          .map(addItem)
          .filter((item): item is { label: string; href: string } => Boolean(item))
      );
    }

    return menu.cards
      .map((card) => addItem({ label: card.title, href: card.href }))
      .filter((item): item is { label: string; href: string } => Boolean(item));
  };

  const openMobileSubmenu = (title: string, menu: MegaMenuContent | null) => {
    setMobileTitle(title);
    setMobileItems(flattenMegaItems(menu));
    setMobilePane('submenu');
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const setVar = () =>
      document.documentElement.style.setProperty('--header-h', `${el.getBoundingClientRect().height}px`);
    setVar();
    const ro = new ResizeObserver(setVar);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setOpen(false);
    setSearchOpen(false);
    setBookingOpen(false);
    setActiveMegaMenu(null);
    setMobilePane('main');
    setMobileTitle('Menu');
    setMobileItems([]);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, [pathname]);

  const handleHashScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('/#') && pathname === '/') {
      e.preventDefault();
      const id = href.slice(2);
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      (e.currentTarget as HTMLElement).blur();
    }
  };

  return (
    <>
      <header 
        ref={headerRef} 
        className={`site-header ${isHome ? 'site-header--absolute' : 'site-header--solid'}`}
        onMouseLeave={() => setActiveMegaMenu(null)}
      >
        <nav
          className={`site-nav ${scrolled ? 'site-nav--scrolled' : isHome ? 'site-nav--home-transparent' : 'site-nav--solid'}`}
          aria-label="Main navigation"
        >
          <div className="nav-logo-row">
            <div className="nav-left" ref={leftClusterRef}>
              <button
                type="button"
                className="nav-icon-btn nav-glow-frame"
                aria-label="Search"
                onClick={() => setSearchOpen(true)}
              >
                <SearchIcon />
              </button>
              <a href={`tel:${phoneTel}`} className="nav-icon-btn nav-glow-frame" aria-label="Call the atelier">
                <PhoneIcon />
              </a>
            </div>

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

            <Link href="/" className="nav-logo nav-glow-frame" aria-label="DANHOV — Home">
              <Image src="/danhov-logo-transparent.png" alt="DANHOV" width={170} height={38} priority />
            </Link>

            <div className="nav-actions" ref={actionsClusterRef}>
              <Link href="/account" className="nav-icon-btn nav-glow-frame" aria-label="Account">
                <AccountIcon />
              </Link>
              <Link
                href="/wishlist"
                className="nav-icon-btn nav-glow-frame nav-wishlist-btn"
                aria-label={wishlistCount > 0 ? `Wishlist, ${wishlistCount} saved` : 'Wishlist'}
              >
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
          </div>

          {/* Navigation Links with Mega Menu Hover Triggers */}
          <ul className="nav-links nav-links-row nav-links--always-visible">
            {LINKS_ROW.map((l) => {
              const active = isActiveLink(pathname, l.href);
              const menuForLink = getMenuForLink(l);
              const openMegaMenu = () => setActiveMegaMenu(menuForLink ?? null);

              return (
                <li
                  key={l.label}
                  onMouseEnter={openMegaMenu}
                >
                  <Link
                    href={l.href}
                    className={active ? 'is-active nav-link-stack' : 'nav-link-stack'}
                    aria-current={active ? 'page' : undefined}
                    onMouseEnter={openMegaMenu}
                    onFocus={openMegaMenu}
                    onClick={(e) => handleHashScroll(e, l.href)}
                  >
                    <span className="nav-link-label">{l.label}</span>
                    {l.sub && <span className="nav-link-sub">{l.sub}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Dynamic Mega Menu Dropdown Panel */}
        {activeMegaMenu && (
          <div 
            className="mega-menu-dropdown is-open"
            onMouseLeave={() => setActiveMegaMenu(null)}
          >
            <div className="mega-menu-container">
              {activeMegaMenu.type === 'standard' && (
                <>
                  {activeMegaMenu.columns.map((col, idx) => (
                    <div key={idx} className="mega-menu-col">
                      <h4 className="mega-menu-col-title">{col.title}</h4>
                      <ul className="mega-menu-col-list">
                        {col.items.map((item, itemIdx) => (
                          <li key={itemIdx}>
                            <Link href={item.href} onClick={() => setActiveMegaMenu(null)}>
                              {item.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}

                  {activeMegaMenu.promo && (
                    <div className="mega-menu-promo">
                      <Link href={activeMegaMenu.promo.href} onClick={() => setActiveMegaMenu(null)}>
                        <div className="mega-menu-promo-img-wrapper">
                          <Image 
                            src={activeMegaMenu.promo.image} 
                            alt={activeMegaMenu.promo.title} 
                            fill 
                            style={{ objectFit: 'cover' }} 
                          />
                        </div>
                        <span className="mega-menu-promo-title">{activeMegaMenu.promo.title}</span>
                      </Link>
                    </div>
                  )}
                </>
              )}

              {activeMegaMenu.type === 'cards' && (
                <div className="mega-menu-cards-wrapper">
                  <div className="mega-menu-cards-grid">
                    {activeMegaMenu.cards.map((card, idx) => (
                      <Link key={idx} href={card.href} className="mega-card-item" onClick={() => setActiveMegaMenu(null)}>
                        <div className="mega-card-img-wrapper">
                          <Image src={card.image} alt={card.title} fill style={{ objectFit: 'cover' }} />
                        </div>
                        <span className="mega-card-title">{card.title}</span>
                      </Link>
                    ))}
                  </div>
                  {activeMegaMenu.footerText && (
                    <div className="mega-cards-footer">
                      <p>
                        {activeMegaMenu.footerText.text}{' '}
                        <Link href={activeMegaMenu.footerText.href} onClick={() => setActiveMegaMenu(null)}>
                          {activeMegaMenu.footerText.linkText}
                        </Link>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <div className={`mega-overlay${activeMegaMenu ? ' is-open' : ''}`} aria-hidden="true" />

      {/* Mobile Drawer */}
      <div
        id="mobile-drawer"
        className={`nav-drawer${open ? ' is-open' : ''}`}
        aria-hidden={!open}
        role="dialog"
        aria-label="Site menu"
      >
        <div className="nav-drawer-header">
          <button
            type="button"
            className="nav-drawer-close"
            aria-label={mobilePane === 'submenu' ? 'Back to menu' : 'Close menu'}
            onClick={() => {
              if (mobilePane === 'submenu') {
                setMobilePane('main');
                setMobileTitle('Menu');
                setMobileItems([]);
                return;
              }
              setOpen(false);
            }}
          >
            {mobilePane === 'submenu' ? '‹' : '×'}
          </button>

          <div className="nav-drawer-brand">DANHOV</div>

          <div className="nav-drawer-mini-actions">
            <button type="button" className="nav-drawer-mini-btn" aria-label="Search" onClick={() => setSearchOpen(true)}>
              <SearchIcon />
            </button>
            <Link href="/wishlist" className="nav-drawer-mini-btn" aria-label="Wishlist">
              <WishlistIcon />
            </Link>
            <button type="button" className="nav-drawer-mini-btn" aria-label="Cart" onClick={openDrawer}>
              <CartIcon />
            </button>
          </div>
        </div>

        {mobilePane === 'main' ? (
          <ul className="nav-drawer-links">
            {LINKS_ROW.map((l) => {
              const hasChildren = Boolean(getMenuForLink(l));

              if (hasChildren) {
                return (
                  <li key={l.label}>
                    <button
                      type="button"
                      className="nav-drawer-link-button"
                      onClick={() => openMobileSubmenu(l.label, getMenuForLink(l))}
                    >
                      <span className="nav-link-label">{l.label}</span>
                      <span className="nav-drawer-caret">›</span>
                    </button>
                  </li>
                );
              }

              return (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    onClick={(e) => {
                      handleHashScroll(e, l.href);
                      setOpen(false);
                    }}
                  >
                    <span className="nav-link-label">{l.label}</span>
                    {l.sub && <span className="nav-drawer-sub">{l.sub}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="nav-drawer-submenu">
            <div className="nav-drawer-subheader">
              <button
                type="button"
                className="nav-drawer-back"
                aria-label="Back to main menu"
                onClick={() => {
                  setMobilePane('main');
                  setMobileTitle('Menu');
                  setMobileItems([]);
                }}
              >
                ‹
              </button>
              <span>{mobileTitle}</span>
            </div>

            <div className="nav-drawer-sublist">
              {mobileItems.map((item, index) => (
                <Link
                  key={`${item.label}-${item.href}-${index}`}
                  href={item.href}
                  onClick={() => {
                    setOpen(false);
                    setMobilePane('main');
                    setMobileTitle('Menu');
                    setMobileItems([]);
                  }}
                >
                  <span>{item.label}</span>
                  <span className="nav-drawer-caret">›</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <BookingModal open={bookingOpen} onClose={() => setBookingOpen(false)} />
    </>
  );
}

// Icons
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
      <path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
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
      <path d="M4 5h2.2l2.6 11.4a2 2 0 0 0 2 1.6h7.4a2 2 0 0 0 2-1.6L21.5 8H7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="20.5" r="1.4" fill="currentColor" />
      <circle cx="18" cy="20.5" r="1.4" fill="currentColor" />
    </svg>
  );
} 