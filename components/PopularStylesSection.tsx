'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import ProductDetailModal from '@/components/ProductDetail';
import type { Product } from '@/lib/products';
import type { PopularStyleProductItem } from '@/lib/popular-styles';

interface ProductItem {
  id: string;
  name: string;
  collection: string;
  description?: string;
  price?: string;
  image: string;
  href: string;
  product?: Product;
}

interface PopularStylesProps {
  title?: string;
  subtitle?: string;
  description?: string;
  shopLinkText?: string;
  shopLinkHref?: string;
  products?: ProductItem[];
  headingSize?: string;
  descriptionSize?: string;
  titleSize?: string;
  productTitleSize?: string;
  collectionSize?: string;
}

export default function PopularStylesSection({
  title = 'Most Popular Summer Styles',
  subtitle = 'Lock by Danhov',
  description = "Lock is an expression of love's enduring protection.",
  shopLinkText = 'Shop the Collection',
  shopLinkHref = '/fine-jewelry',
  products = [],
  headingSize,
  descriptionSize,
  titleSize,
  productTitleSize,
  collectionSize,
}: PopularStylesProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const handleScroll = () => {
    if (trackRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = trackRef.current;
      const maxScroll = scrollWidth - clientWidth;
      if (maxScroll > 0) {
        const progress = (scrollLeft / maxScroll) * 100;
        setScrollProgress(progress);
      }
    }
  };

  useEffect(() => {
    const track = trackRef.current;
    if (track) {
      track.addEventListener('scroll', handleScroll);
      handleScroll(); // Initial check
      return () => track.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const scrollLeft = () => {
    if (trackRef.current) {
      trackRef.current.scrollBy({ left: -400, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (trackRef.current) {
      trackRef.current.scrollBy({ left: 400, behavior: 'smooth' });
    }
  };

  const loopProducts = products.length > 0 ? [...products, ...products, ...products] : [];

  return (
    <section className="popstyles-section">
      {/* ── Collection Banner ── */}
      {subtitle && (
        <div className="popstyles-banner">
          <h2 
            className="popstyles-banner-title" 
            style={headingSize ? { fontSize: headingSize } : undefined}
          >
            {subtitle}
          </h2>
          {description && (
            <p 
              className="popstyles-banner-desc" 
              style={descriptionSize ? { fontSize: descriptionSize } : undefined}
            >
              {description}
            </p>
          )}
          {shopLinkText && (
            <Link href={shopLinkHref} className="popstyles-shop-link">
              {shopLinkText}
            </Link>
          )}
        </div>
      )}

      {/* ── Full-Screen Carousel Section ── */}
      <div className="popstyles-carousel-wrap">
        {title && (
          <h3 
            className="popstyles-section-title"
            style={titleSize ? { fontSize: titleSize } : undefined}
          >
            {title}
          </h3>
        )}

        {loopProducts.length > 0 && (
          <div className="popstyles-track-container" ref={trackRef}>
            <div className="popstyles-list">
              {loopProducts.map((product, idx) => {
                const cardBody = (
                  <>
                    <div className="popstyles-media">
                      <img src={product.image} alt={product.name} loading="lazy" />
                    </div>
                    <div className="popstyles-info">
                      <span 
                        className="popstyles-col-name"
                        style={collectionSize ? { fontSize: collectionSize } : undefined}
                      >
                        {product.collection}
                      </span>
                      <h4 
                        className="popstyles-prod-name"
                        style={productTitleSize ? { fontSize: productTitleSize } : undefined}
                      >
                        {product.name}
                      </h4>
                      {product.price && <span className="popstyles-prod-price">{product.price}</span>}
                    </div>
                  </>
                );

                return product.product ? (
                  <button
                    key={`${product.id}-${idx}`}
                    type="button"
                    className="popstyles-card"
                    onClick={() => setSelectedProduct(product.product ?? null)}
                    aria-label={`Open product details for ${product.name}`}
                  >
                    {cardBody}
                  </button>
                ) : (
                  <Link key={`${product.id}-${idx}`} href={product.href} className="popstyles-card">
                    {cardBody}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Professional Controls & Interactive Progress Line (Matching your reference image) */}
        <div className="popstyles-controls">
          <button type="button" className="popstyles-nav-btn" onClick={scrollLeft} aria-label="Scroll left">
            ‹
          </button>
          
          <div className="popstyles-scrollbar-track">
            <div 
              className="popstyles-scrollbar-thumb" 
              style={{ transform: `translateX(${scrollProgress}%)` }}
            />
          </div>

          <button type="button" className="popstyles-nav-btn" onClick={scrollRight} aria-label="Scroll right">
            ›
          </button>
        </div>
      </div>

      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </section>
  );
}