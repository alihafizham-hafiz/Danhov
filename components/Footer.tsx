'use client';

import Link from 'next/link';

interface FooterLink {
  label: string;
  href: string;
}

interface FooterColumn {
  heading: string;
  links: FooterLink[];
}

interface FooterProps {
  columns?: FooterColumn[];
  copyrightText?: string;
  locationText?: string;
  locationHref?: string;
  logoText?: string;
  socials?: FooterLink[];
}

const DEFAULT_COLUMNS: FooterColumn[] = [
  {
    heading: 'Support',
    links: [
      { label: 'Track Your Order', href: '/track-order' },
      { label: 'Contact Us', href: '/contact' },
      { label: 'Book An Appointment', href: '/appointments' },
      { label: 'Frequently Asked Questions', href: '/faq' },
      { label: 'Shipping & Return Policy', href: '/shipping-returns' },
    ],
  },
  {
    heading: 'Services',
    links: [
      { label: 'Contact a DANHOV Expert', href: '/expert' },
      { label: 'Request Repair', href: '/repair' },
      { label: 'Personalization', href: '/personalization' },
    ],
  },
  {
    heading: 'About',
    links: [
      { label: 'Sustainability', href: '/sustainability' },
      { label: 'DANHOV Careers', href: '/careers' },
      { label: 'DANHOV for the Press', href: '/press' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms & Conditions', href: '/terms' },
      { label: 'Accessibility Statement', href: '/accessibility' },
    ],
  },
];

const DEFAULT_SOCIALS: FooterLink[] = [
  { label: 'Instagram', href: 'https://instagram.com/danhovjewelry/' },
  { label: 'Twitter', href: 'https://twitter.com/DanhovJewelry' },
  { label: 'Facebook', href: 'https://www.facebook.com/DanhovJewelry' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/602504/' },
  { label: 'Pinterest', href: 'https://www.pinterest.com/danhovjewelers/' },
];

export default function Footer({
  columns = DEFAULT_COLUMNS,
  copyrightText = '© DANHOV. 2026',
  locationText = 'United States',
  locationHref = '/location',
  socials = DEFAULT_SOCIALS,
}: FooterProps) {
  return (
    <footer className="danhov-footer">
      <div className="danhov-footer-container">
        {/* Dynamic 4 Columns Grid */}
        <div className="danhov-footer-grid">
          {columns.map((col, idx) => (
            <div key={idx} className="danhov-footer-col">
              <h4 className="danhov-footer-heading">{col.heading}</h4>
              <ul className="danhov-footer-links">
                {col.links.map((link, linkIdx) => (
                  <li key={linkIdx}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider Line */}
        <div className="danhov-footer-divider" />

        {/* Bottom Bar */}
        <div className="danhov-footer-bottom">
          <div className="danhov-footer-left">
            <span>{copyrightText}</span>
            <span className="danhov-loc">
              Change Location: <Link href={locationHref}>{locationText}</Link>
            </span>
          </div>

          <div className="danhov-footer-logo">
            <Link href="/">
              <span className="danhov-logo-text"> <img 
    alt="DANHOV" 
    width="170" 
    height="38" 
    decoding="async" 
    data-nimg="1" 
    style={{ color: 'transparent' }} 
    src="/danhov-logo-transparent.png" 
  /> </span>
            </Link>
          </div>

          <div className="danhov-footer-socials">
            {socials.map((social, idx) => (
              <Link key={idx} href={social.href} target="_blank" rel="noopener noreferrer">
                {social.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}