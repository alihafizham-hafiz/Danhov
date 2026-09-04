'use client';

import { Suspense } from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import Footer from '@/components/Footer';
import { CartProvider } from '@/components/CartProvider';
import WishlistProvider from '@/components/WishlistProvider';
import CartDrawer from '@/components/CartDrawer';
import ScrollTopOnRoute from '@/components/ScrollTopOnRoute';
import AnnouncementBar from '@/components/AnnouncementBar';
import Nav from '@/components/Nav';

export default function PublicChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin') ?? false;

  if (isAdmin) return <>{children}</>;

  return (
    <CartProvider>
      <WishlistProvider>
        <Suspense fallback={null}>
          <ScrollTopOnRoute />
        </Suspense>
        <AnnouncementBar/>
        <Nav />
        <div className="route-content">{children}</div>
        <Footer />
        <CartDrawer />
        {/* chatKey is required by ZyraTalk's embed snippet but isn't part of next/script's typed props. */}
        <Script
          id="chatBT"
          src="https://nowl.ink/1791z3115a"
          strategy="afterInteractive"
          {...({ chatKey: 'SOoG9ek8vWZdsbgN3JVC' } as Record<string, string>)}
        />
      </WishlistProvider>
    </CartProvider>
  );
}