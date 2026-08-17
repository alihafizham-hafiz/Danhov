import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Gift Card Purchased · DANHOV' };

export default function GiftCardSuccessPage() {
  return (
    <main style={{ fontFamily: "var(--font-cormorant), 'Cormorant Garamond', serif", background: '#faf6f1', minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div style={{ maxWidth: 520, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 40, color: '#AC3438', marginBottom: 20 }}>◇</div>
        <h1 style={{ fontFamily: "var(--font-cormorant), 'Cormorant Garamond', serif", fontSize: 36, fontWeight: 400, color: '#1a1410', margin: '0 0 16px' }}>
          Gift card sent.
        </h1>
        <p style={{ fontSize: 15, color: '#6b5e57', lineHeight: 1.7, margin: '0 0 32px' }}>
          Your DANHOV gift card has been purchased and will be delivered to the
          recipient&apos;s email on the date you selected. A receipt has been sent to
          your email as well.
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/engagement-rings"
            style={{ display: 'inline-block', padding: '13px 32px', background: '#AC3438', color: '#fff', textDecoration: 'none', fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase' }}
          >
            Explore Collection
          </Link>
          <Link
            href="/gift-cards"
            style={{ display: 'inline-block', padding: '13px 32px', border: '1px solid #1a1410', color: '#1a1410', textDecoration: 'none', fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase' }}
          >
            Buy Another
          </Link>
        </div>
      </div>
    </main>
  );
}
