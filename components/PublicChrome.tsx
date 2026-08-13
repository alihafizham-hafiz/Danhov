'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Cursor from '@/components/Cursor';
import InitialLoader from '@/components/InitialLoader';
import { CartProvider } from '@/components/CartProvider';
import WishlistProvider from '@/components/WishlistProvider';
import CartDrawer from '@/components/CartDrawer';
import ScrollTopOnRoute from '@/components/ScrollTopOnRoute';

const ChatWidget = dynamic(() => import('@/components/ChatWidget'), { ssr: false });

export default function PublicChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin') ?? false;

  if (isAdmin) return <>{children}</>;

  return (
    <CartProvider>
      <InitialLoader />
      <WishlistProvider>
        <Suspense fallback={null}>
          <ScrollTopOnRoute />
        </Suspense>
        <Cursor />
        <Nav />
        <div className="route-content">{children}</div>
        <Footer />
        <CartDrawer />
        <Suspense fallback={null}>
          <ChatWidget />
        </Suspense>
      </WishlistProvider>
    </CartProvider>
  );
}
