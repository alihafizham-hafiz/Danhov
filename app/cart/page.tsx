import type { Metadata } from 'next';
import CartPageClient from './CartPageClient';
import { bankTransferEnabled } from '@/lib/bank';

export const metadata: Metadata = {
  title: 'Your Cart · DANHOV',
  description: 'Review your selected DANHOV pieces before commission.',
  alternates: { canonical: '/cart' },
  robots: { index: false, follow: false },
};

export default function CartPage() {
  // Resolved on the server — the bank env vars must never reach the client.
  return <CartPageClient bankEnabled={bankTransferEnabled()} />;
}
