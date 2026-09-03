import { describe, expect, it } from 'vitest';

import { normalizePopularStyleProducts } from '@/lib/popular-styles';

describe('normalizePopularStyleProducts', () => {
  it('maps live catalog products into the section format', () => {
    const products = [
      {
        id: 'p-1',
        sku: 'AB123',
        slug: 'danhov-abc-ring',
        name: 'Abbraccio Ring',
        collection: 'Abbraccio',
        price_display: '$3,800',
        images: ['https://example.com/ring.jpg'],
      },
      {
        id: 'p-2',
        sku: 'CD456',
        slug: 'danhov-cd-pendant',
        name: 'Pendant',
        collection: 'Per Lei',
        price_display: '$2,950',
        images: ['https://example.com/pendant.jpg'],
      },
    ];

    expect(normalizePopularStyleProducts(products)).toEqual([
      {
        id: 'p-1',
        name: 'Abbraccio Ring',
        collection: 'Abbraccio',
        price: '$3,800',
        image: 'https://example.com/ring.jpg',
        href: '/product/danhov-abc-ring',
      },
      {
        id: 'p-2',
        name: 'Pendant',
        collection: 'Per Lei',
        price: '$2,950',
        image: 'https://example.com/pendant.jpg',
        href: '/product/danhov-cd-pendant',
      },
    ]);
  });

  it('uses a fallback image when the catalog product has no usable image', () => {
    const products = [{
      id: 'p-3',
      sku: 'ZZ999',
      slug: 'danhov-default-ring',
      name: 'Ring Without Image',
      collection: 'Classico',
      price_display: '$1,200',
      images: [],
    }];

    expect(normalizePopularStyleProducts(products)[0].image).toBeTruthy();
    expect(normalizePopularStyleProducts(products)[0].href).toBe('/product/danhov-default-ring');
  });
});
