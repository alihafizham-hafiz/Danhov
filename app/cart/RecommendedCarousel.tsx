'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function RecommendedCarousel() {
  // Array defining the top 5 items with actual image URLs
  const recommendedItems = [
    {
      id: 1,
      title: 'Gold and Platinum Jewelry Care Kit',
      brand: 'Danhov',
      image: '/products/product-1.jpg',
      href: '/gift-cards',
    },
    {
      id: 2,
      title: 'Jewelry Polishing Cloth',
      brand: 'Danhov',
      image: '/products/product-2.jpg',
      href: '/fine-jewelry',
    },
    {
      id: 3,
      title: 'Silver Jewelry Care Kit with Spray',
      brand: 'Danhov',
      image: '/products/product-3.jpg',
      href: '/gift-cards',
    },
    {
      id: 4,
      title: 'Silver Polishing Cloth in Fabric',
      brand: 'Danhov',
      image: '/products/product-4.jpg',
      href: '/fine-jewelry',
    },
    {
      id: 5,
      title: 'Leather Care Kit with Cloth and Spray',
      brand: 'Danhov',
      image: '/products/product-5.png',
      href: '/fine-jewelry',
    },
  ];

  return (
    <section className="recommended-section">
      <h2 className="recommended-title">Recommended for You</h2>
      
      <div className="recommended-carousel-wrapper">
        <div className="recommended-track">
          {recommendedItems.map((item) => (
            <Link href={item.href} key={item.id} className="recommended-card">
              <div className="recommended-img-box">
                <Image 
                  src={item.image} 
                  alt={item.title} 
                  fill 
                  sizes="260px" 
                  style={{ objectFit: 'cover', padding: '16px' }} 
                />
              </div>
              <div className="recommended-info">
                <span className="recommended-brand">{item.brand}</span>
                <span className="recommended-desc">{item.title}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}