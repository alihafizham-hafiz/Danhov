import Link from 'next/link';
import Image from 'next/image';

const SOCIAL_LINKS = [
  {
    name: 'Instagram',
    href: 'https://instagram.com/danhovjewelry/',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    name: 'Pinterest',
    href: 'https://www.pinterest.com/danhovjewelers/',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.08 3.15 9.42 7.6 11.18-.1-.95-.2-2.41.04-3.45.22-.94 1.4-5.97 1.4-5.97s-.36-.72-.36-1.78c0-1.67.97-2.92 2.17-2.92 1.03 0 1.52.77 1.52 1.7 0 1.03-.66 2.58-1 4.02-.28 1.21.6 2.19 1.79 2.19 2.15 0 3.81-2.27 3.81-5.55 0-2.9-2.08-4.93-5.06-4.93-3.45 0-5.47 2.59-5.47 5.26 0 1.04.4 2.16.9 2.77.1.12.11.22.08.34l-.34 1.36c-.05.22-.18.27-.41.16-1.5-.7-2.45-2.9-2.45-4.66 0-3.8 2.76-7.28 7.95-7.28 4.18 0 7.42 2.97 7.42 6.95 0 4.14-2.61 7.48-6.24 7.48-1.22 0-2.36-.63-2.75-1.38l-.75 2.85c-.27 1.04-1 2.36-1.49 3.16 1.12.35 2.31.53 3.55.53 6.63 0 12-5.37 12-12C24 5.37 18.63 0 12 0z" />
      </svg>
    ),
  },
  {
    name: 'Facebook',
    href: 'https://www.facebook.com/DanhovJewelry',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 4.99 3.66 9.13 8.44 9.88v-6.99H7.9v-2.89h2.54V9.85c0-2.51 1.5-3.89 3.78-3.89 1.1 0 2.24.2 2.24.2v2.46H15.2c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.89h-2.34V21.94c4.78-.75 8.43-4.89 8.43-9.88z" />
      </svg>
    ),
  },
  {
    name: 'Twitter / X',
    href: 'https://twitter.com/DanhovJewelry',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    name: 'LinkedIn',
    href: 'https://www.linkedin.com/company/602504/',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.26 2.37 4.26 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .78 0 1.74v20.51C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.75V1.74C24 .78 23.2 0 22.22 0z" />
      </svg>
    ),
  },
];

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer>
      <div className="footer-top">

        {/* ── Brand column ─────────────────────────────────────────── */}
        <div className="footer-brand">
          <Link href="/" className="footer-brand-name" aria-label="DANHOV — Home">
            <Image
              src="/danhov-logo-transparent.png"
              alt="DANHOV"
              width={130}
              height={30}
              style={{ height: 30, width: 'auto', display: 'block' }}
            />
          </Link>
          <p className="footer-tagline">
            Sacred geometry. Eternal love.<br />
            Handcrafted in Los Angeles since 1984.
          </p>
          <address className="footer-contact" aria-label="DANHOV contact information">
            <a className="footer-contact-line footer-contact-link" href="tel:+14244214072">(424) 421-4072</a>
            <a className="footer-contact-line footer-contact-link" href="mailto:care@danhov.com">care@danhov.com</a>
            <a
              className="footer-contact-line footer-contact-link"
              href="https://maps.google.com/?q=3439+Cahuenga+Blvd+W,+Los+Angeles,+CA+90068"
              target="_blank"
              rel="noopener noreferrer"
            >
              Los Angeles, CA 90068
            </a>
          </address>
          <ul className="footer-social footer-social--col" aria-label="DANHOV on social media">
            {SOCIAL_LINKS.map((s) => (
              <li key={s.name}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.name}
                  className="footer-social-link"
                >
                  {s.icon}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Shop ─────────────────────────────────────────────────── */}
        <div>
          <div className="footer-col-title">Shop</div>
          <ul className="footer-links">
            <li><Link href="/engagement-rings">Engagement Rings</Link></li>
            <li><Link href="/wedding-bands">Wedding Bands</Link></li>
            <li><Link href="/fine-jewelry">Fine Jewelry</Link></li>
            <li><Link href="/mens">Men&apos;s Jewelry</Link></li>
            <li><Link href="/ring-builder">Ring Builder</Link></li>
            <li><Link href="/gift-cards">Gift Cards</Link></li>
          </ul>
        </div>

        {/* ── Company ──────────────────────────────────────────────── */}
        <div>
          <div className="footer-col-title">Company</div>
          <ul className="footer-links">
            <li><Link href="/story">Our Story</Link></li>
            <li><Link href="/philosophy">Philosophy</Link></li>
            <li><Link href="/sustainability">Sustainability</Link></li>
            <li><Link href="/blog">Blog</Link></li>
            <li><Link href="/partner">Partner With Us</Link></li>
            <li><Link href="/affiliate">Affiliate Program</Link></li>
          </ul>
        </div>

        {/* ── Support ──────────────────────────────────────────────── */}
        <div>
          <div className="footer-col-title">Support</div>
          <ul className="footer-links">
            <li><Link href="/faq">FAQs</Link></li>
            <li><Link href="/shipping-and-return-policy">Shipping &amp; Returns</Link></li>
            <li><Link href="/warranty">Lifetime Warranty</Link></li>
            <li><Link href="/track-order">Track Order</Link></li>
            <li><Link href="/privacy-policy">Privacy Policy</Link></li>
            <li><Link href="/terms-of-use">Terms &amp; Conditions</Link></li>
          </ul>
        </div>

      </div>

      <div className="footer-bottom">
        <span className="footer-copy">
          © {year} DANHOV · Handcrafted in Los Angeles since 1984.
        </span>
        <span className="footer-final-quote footer-final-quote--mid">
          &ldquo;Waves are the ocean.&rdquo;
        </span>
        <span className="footer-copy footer-copy--invisible" aria-hidden="true">
          © {year} DANHOV · Handcrafted in Los Angeles since 1984.
        </span>
      </div>
    </footer>
  );
}
