'use client';

import Link from 'next/link';

interface CategoryItem {
  id: string;
  name: string;
  image: string;
  href: string;
  isActive?: boolean;
}

interface ShopByCategoryProps {
  title?: string;
  categories?: CategoryItem[];
}

const DEFAULT_CATEGORIES: CategoryItem[] = [
  {
    id: '1',
    name: 'NECKLACES & PENDANTS',
    image: '/collections/pendant.png',
    href: '/fine-jewelry',
    isActive: true, 
  },
  {
    id: '2',
    name: 'BRACELETS',
    image: '/collections/braclet.png',
    href: '/fine-jewelry',
  },
  {
    id: '3',
    name: 'EARRINGS',
    image: '/collections/earings.png',
    href: '/fine-jewelry',
  },
  {
    id: '4',
    name: 'RINGS',
    image: '/collections/rings.png',
    href: '/fine-jewelry',
  },
];

export default function ShopByCategorySection({
  title = 'Shop by Category',
  categories = DEFAULT_CATEGORIES,
}: ShopByCategoryProps) {
  return (
    <section className="cat-shop-section">
      <div className="cat-shop-container">
        <h2 className="cat-shop-title">{title}</h2>

        <div className="cat-shop-grid">
          {categories.map((cat) => (
            <Link key={cat.id} href={cat.href} className="cat-shop-card">
              <div className="cat-shop-img-wrap">
                <img src={cat.image} alt={cat.name} loading="lazy" />
              </div>
              <div className={`cat-shop-name ${cat.isActive ? 'is-active' : ''}`}>
                <span>{cat.name}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}