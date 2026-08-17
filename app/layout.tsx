import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { GoogleAnalytics } from '@next/third-parties/google';
import { Cormorant_Garamond } from 'next/font/google';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-cormorant',
});
import PublicChrome from '@/components/PublicChrome';
import { buildOrganization, jsonLdScript, SITE_URL } from '@/lib/seo';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'DANHOV — Handcrafted Luxury Jewelry · Los Angeles · Est. 1984',
    template: '%s — DANHOV',
  },
  description:
    'DANHOV is a luxury handcrafted jewelry house founded in Los Angeles in 1984 by Jack Hovsepian. Every engagement ring, wedding band, and fine-jewelry piece is made to order in 14k or 18k gold — with a lifetime craftsmanship warranty.',
  keywords: [
    'DANHOV',
    'luxury jewelry',
    'engagement rings',
    'wedding bands',
    'handcrafted jewelry',
    'Los Angeles jewelry',
    '14k gold',
    '18k gold',
    'Jack Hovsepian',
    'custom engagement rings',
    'spiral engagement rings',
    'Abbraccio',
    'Voltaggio',
    'sacred geometry rings',
  ],
  authors: [{ name: 'DANHOV', url: SITE_URL }],
  creator: 'DANHOV',
  publisher: 'DANHOV',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: 'DANHOV',
    title: 'DANHOV — Handcrafted Luxury Jewelry · Est. 1984',
    description:
      'Luxury handcrafted jewelry. Made to order in Los Angeles. 14k or 18k gold. Lifetime craftsmanship warranty.',
    images: [
      {
        url: '/danhov-logo-transparent.png',
        width: 1200,
        height: 630,
        alt: 'DANHOV — Luxury Handcrafted Jewelry',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DANHOV — Handcrafted Luxury Jewelry · Est. 1984',
    description:
      'Luxury handcrafted jewelry. Made to order in Los Angeles. 14k or 18k gold.',
    images: ['/danhov-logo-transparent.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: '/favicon.svg',
  },
  formatDetection: {
    telephone: true,
    address: true,
    email: true,
  },
  category: 'Jewelry',
};

export const viewport: Viewport = {
  themeColor: '#AC3438',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.className} ${cormorant.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLdScript(buildOrganization())}
        />
      </head>
      <body>
        <PublicChrome>{children}</PublicChrome>
        {/* Baseline instrumentation. Without this none of the success metrics
            in the brief (conversion, engagement time, bookings) are measurable.
            Loaded for storefront and admin alike; it is cookieless. */}
        <Analytics />
      </body>
      <GoogleAnalytics gaId="G-HE85QHZ7WW" />
    </html>
  );
}
