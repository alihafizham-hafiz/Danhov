'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { createClient } from '@/lib/supabase/client';

export type CartBundleDiamond = {
  offer_id: string;
  hold_id: string | null;
  shape: string;
  carat: number;
  color: string;
  clarity: string;
  cut: string;
  lab: string | null;
  cert_number: string | null;
  price_usd: number;
  image: string | null;
};

export type CartGiftCard = {
  recipientName: string;
  recipientEmail: string;
  senderName: string;
  senderEmail: string;
  message: string;
  deliverAt: string;
  amount: number;
  quantity: number;
};

export type CartItem = {
  id: string;          // composite key (product + selected variation)
  sku: string;
  slug: string;
  name: string;
  collection: string | null;
  metal: string | null;
  variant_key?: string | null;
  variant_label?: string | null;
  image: string | null;
  price_display: string | null;
  price_num: number;
  qty: number;
  // Optional bundle data when this cart row is a setting + diamond pair.
  // ring_size is captured separately so the studio doesn't have to parse
  // the metal string at fulfilment.
  ring_size?: string | null;
  note?: string | null;
  bundle?: {
    setting_price_usd: number;
    diamond: CartBundleDiamond;       // first / only diamond (backward compat)
    diamonds?: CartBundleDiamond[];   // all diamonds for multi-diamond bundles
  } | null;
  giftCard?: CartGiftCard | null;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  drawerOpen: boolean;
  signedIn: boolean;
  authReady: boolean;
  addItem: (item: Omit<CartItem, 'qty'> & { qty?: number }) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, patch: Partial<Pick<CartItem, 'qty' | 'metal' | 'ring_size' | 'variant_key' | 'variant_label' | 'name'>>) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
};

const STORAGE_KEY = 'danhov:cart:v1';
const CartContext = createContext<CartContextValue | null>(null);

function readStorage(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (it: unknown): it is CartItem =>
        !!it &&
        typeof it === 'object' &&
        typeof (it as CartItem).id === 'string' &&
        typeof (it as CartItem).sku === 'string'
    );
  } catch {
    return [];
  }
}

function writeStorage(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // localStorage full or blocked — ignore, cart stays in memory only
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  // Hydrate from localStorage once on mount
  useEffect(() => {
    setItems(readStorage());
    setHydrated(true);
  }, []);

  // Persist every change after hydration
  useEffect(() => {
    if (!hydrated) return;
    writeStorage(items);
  }, [items, hydrated]);

  // Cross-tab sync
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      setItems(readStorage());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Track Supabase auth for display only (e.g. account menu). The cart is
  // guest-friendly: it lives in localStorage and is NOT cleared on sign-out,
  // so shoppers never need an account to build or keep a cart. (Client
  // request: remove the mandatory signup — the localStorage cart is the
  // persistence layer.)
  useEffect(() => {
    const supabase = createClient();
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setSignedIn(!!data.user);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setSignedIn(!!session?.user);
      setAuthReady(true);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const addItem: CartContextValue['addItem'] = useCallback((incoming) => {
    setItems((prev) => {
      const variantKey = incoming.variant_key ?? incoming.metal ?? 'default';
      const id = `${incoming.id}:${variantKey}`;
      const existing = prev.find((it) => it.id === id);
      const addQty = incoming.qty ?? 1;
      if (existing) {
        return prev.map((it) =>
          it.id === id ? { ...it, qty: Math.min(99, it.qty + addQty) } : it
        );
      }
      return [
        ...prev,
        {
          id,
          sku: incoming.sku,
          slug: incoming.slug,
          name: incoming.name,
          collection: incoming.collection,
          metal: incoming.metal,
          variant_key: incoming.variant_key ?? incoming.metal ?? null,
          variant_label: incoming.variant_label ?? null,
          image: incoming.image,
          price_display: incoming.price_display,
          price_num: incoming.price_num,
          qty: Math.min(99, addQty),
          ring_size: incoming.ring_size ?? null,
          bundle: incoming.bundle ?? null,
        },
      ];
    });
    setDrawerOpen(true);
  }, []);

  const removeItem: CartContextValue['removeItem'] = useCallback((id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const updateItem: CartContextValue['updateItem'] = useCallback((id, patch) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const nextQty = patch.qty != null ? Math.max(1, Math.min(99, patch.qty)) : it.qty;
        return {
          ...it,
          qty: nextQty,
          name: patch.name !== undefined ? patch.name : it.name,
          metal: patch.metal !== undefined ? patch.metal : it.metal,
          variant_key: patch.variant_key !== undefined ? patch.variant_key : it.variant_key,
          variant_label: patch.variant_label !== undefined ? patch.variant_label : it.variant_label,
          ring_size: patch.ring_size !== undefined ? patch.ring_size : it.ring_size,
        };
      })
    );
  }, []);

  const setQty: CartContextValue['setQty'] = useCallback((id, qty) => {
    setItems((prev) => {
      if (qty <= 0) return prev.filter((it) => it.id !== id);
      return prev.map((it) =>
        it.id === id ? { ...it, qty: Math.min(99, qty) } : it
      );
    });
  }, []);

  const clear: CartContextValue['clear'] = useCallback(() => {
    setItems([]);
  }, []);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const toggleDrawer = useCallback(() => setDrawerOpen((d) => !d), []);

  const value = useMemo<CartContextValue>(() => {
    // Guest cart: the cart is always the localStorage-backed items —
    // no sign-in required (client request, mirrors Brilliant Earth). The
    // browser's own storage scopes the cart per device/visitor.
    const count = items.reduce((sum, it) => sum + it.qty, 0);
    const subtotal = items.reduce((sum, it) => sum + it.price_num * it.qty, 0);
    return {
      items,
      count,
      subtotal,
      drawerOpen,
      signedIn,
      authReady,
      addItem,
      removeItem,
      updateItem,
      setQty,
      clear,
      openDrawer,
      closeDrawer,
      toggleDrawer,
    };
  }, [items, signedIn, authReady, drawerOpen, addItem, removeItem, updateItem, setQty, clear, openDrawer, closeDrawer, toggleDrawer]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used inside <CartProvider>');
  }
  return ctx;
}

export function parsePriceDisplay(display: string | null | undefined): number {
  if (!display) return 0;
  const m = display.match(/[\d,]+(?:\.\d+)?/);
  if (!m) return 0;
  return Number(m[0].replace(/,/g, ''));
}

export function formatUsd(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return 'Price on inquiry';
  return `$${Math.round(n).toLocaleString('en-US')}`;
}
