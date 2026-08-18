import { describe, it, expect } from 'vitest';
import { withLocalProductImages, resolveProductImage } from './local-product-images';
import type { Product } from './products';

function baseProduct(overrides: Partial<Product> = {}): Product {
  return {
    sku: 'ZZZ999TEST',
    slug: 'test-product',
    name: 'Test Product',
    images: [],
    metal_images: null,
    ...overrides,
  } as Product;
}

describe('withLocalProductImages', () => {
  it("drops a stale /product-images/ path baked into the DB's own metal_images, even for a SKU the manifest doesn't cover", () => {
    // Reproduces the AE530P bug: R2 covers some metal variants of a product
    // but not all: the DB row still carries a leftover local path (from the
    // pre-R2 pipeline) for the variant R2 has no coverage for, and it must
    // not survive into what actually gets rendered.
    const product = baseProduct({
      metal_images: {
        platinum: ['/product-images/ae530p/platinum/danhov-abbraccio-ladies-engagement-ring-ae530p-1-1.jpg'],
        '14k_rose': ['https://pub-2d92bc9fc39242bf95b565216d0b999e.r2.dev/danhov-abbraccio-ladies-engagement-ring/14k-rose-gold/x-1.jpg'],
      },
    });

    const result = withLocalProductImages(product);

    expect(result.metal_images?.platinum).toBeUndefined();
    expect(result.metal_images?.['14k_rose']).toEqual([
      'https://pub-2d92bc9fc39242bf95b565216d0b999e.r2.dev/danhov-abbraccio-ladies-engagement-ring/14k-rose-gold/x-1.jpg',
    ]);
  });

  it('drops a stale local path from the top-level images array too', () => {
    const product = baseProduct({
      images: ['/product-images/some-sku/default/x-1.jpg', 'https://pub-2d92bc9fc39242bf95b565216d0b999e.r2.dev/ok.jpg'],
    });
    const result = withLocalProductImages(product);
    expect(result.images).toEqual(['https://pub-2d92bc9fc39242bf95b565216d0b999e.r2.dev/ok.jpg']);
  });

  it('never falls back to the raw unfiltered metal_images when every entry for a variant is unresolvable', () => {
    const product = baseProduct({
      metal_images: {
        platinum: ['/product-images/only-bad-path.jpg'],
      },
    });
    const result = withLocalProductImages(product);
    // The whole platinum key should be gone, not silently resurrected.
    expect(result.metal_images).toBeNull();
  });
});

describe('resolveProductImage', () => {
  it('never returns a /product-images/ local path as the fallback image', () => {
    const result = resolveProductImage('ZZZ999TEST', ['/product-images/dead.jpg', 'https://pub-2d92bc9fc39242bf95b565216d0b999e.r2.dev/alive.jpg']);
    expect(result).toBe('https://pub-2d92bc9fc39242bf95b565216d0b999e.r2.dev/alive.jpg');
  });
});
