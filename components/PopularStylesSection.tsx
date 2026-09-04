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
  subtitle = 'Lock by DANHOV',
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
  const scrollbarRef = useRef<HTMLDivElement>(null);
  const isRecenteringRef = useRef(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const loopCopies = 9;
  const loopProducts = products.length > 0
    ? Array.from({ length: loopCopies }, () => products).flat()
    : [];

  const handleScroll = () => {
    const track = trackRef.current;
    const firstSlide = track?.querySelector<HTMLElement>('.popstyles-slide');
    if (!track || !firstSlide || products.length === 0 || isRecenteringRef.current) return;

    const gap = Number.parseFloat(getComputedStyle(firstSlide.parentElement as HTMLElement).columnGap) || 0;
    const groupWidth = (firstSlide.offsetWidth + gap) * products.length;
    const maxScroll = track.scrollWidth - track.clientWidth;

    if (groupWidth > 0 && (track.scrollLeft <= 0 || track.scrollLeft >= maxScroll)) {
      isRecenteringRef.current = true;
      track.scrollLeft += track.scrollLeft <= 0 ? groupWidth : -groupWidth;
      isRecenteringRef.current = false;
    }

    if (maxScroll > 0) {
      const progress = ((track.scrollLeft % groupWidth) / groupWidth) * 100;
      setScrollProgress(Math.max(0, Math.min(100, progress)));
    }
  };

  const handleScrollbarClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    const scrollbar = scrollbarRef.current;
    const firstSlide = track?.querySelector<HTMLElement>('.popstyles-slide');
    if (!track || !scrollbar || !firstSlide || products.length === 0) return;

    const gap = Number.parseFloat(getComputedStyle(firstSlide.parentElement as HTMLElement).columnGap) || 0;
    const step = firstSlide.offsetWidth + gap;
    const groupWidth = step * products.length;
    const bounds = scrollbar.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    const groupStart = Math.floor(track.scrollLeft / groupWidth) * groupWidth;
    track.scrollTo({ left: groupStart + progress * groupWidth, behavior: 'smooth' });
  };

  useEffect(() => {
    const track = trackRef.current;
    if (!track || products.length === 0) return;

    const firstSlide = track.querySelector<HTMLElement>('.popstyles-slide');
    if (!firstSlide) return;

    const gap = Number.parseFloat(getComputedStyle(firstSlide.parentElement as HTMLElement).columnGap) || 0;
    const groupWidth = (firstSlide.offsetWidth + gap) * products.length;
    track.scrollLeft = groupWidth * Math.floor(loopCopies / 2);
    track.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => track.removeEventListener('scroll', handleScroll);
  }, [products.length]);

  const scrollByCard = (direction: -1 | 1) => {
    const track = trackRef.current;
    const slide = track?.querySelector<HTMLElement>('.popstyles-slide');
    if (!track || !slide) return;

    const gap = Number.parseFloat(getComputedStyle(slide.parentElement as HTMLElement).columnGap) || 0;
    const step = slide.offsetWidth + gap;
    const currentIndex = Math.round(track.scrollLeft / step);
    track.scrollTo({ left: (currentIndex + direction) * step, behavior: 'smooth' });
  };

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

                return (
                  <div key={`${product.id}-${idx}`} className="popstyles-slide">
                    {product.product ? (
                      <button
                        type="button"
                        className="popstyles-card"
                        onClick={() => setSelectedProduct(product.product ?? null)}
                        aria-label={`Open product details for ${product.name}`}
                      >
                        {cardBody}
                      </button>
                    ) : (
                      <Link href={product.href} className="popstyles-card">
                        {cardBody}
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Professional Controls & Interactive Progress Line (Matching your reference image) */}
        <div className="popstyles-controls">
          <button type="button" className="popstyles-nav-btn" onClick={() => scrollByCard(-1)} aria-label="Previous product">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 5-7 7 7 7" /></svg>
          </button>
          
          <div
            className="popstyles-scrollbar-track"
            ref={scrollbarRef}
            onClick={handleScrollbarClick}
            role="slider"
            aria-label="Popular styles slide position"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(scrollProgress)}
            tabIndex={0}
          >
            <div 
              className="popstyles-scrollbar-thumb" 
              style={{ transform: `translateX(${scrollProgress * 1.5}%)` }}
            />
          </div>

          <button type="button" className="popstyles-nav-btn" onClick={() => scrollByCard(1)} aria-label="Next product">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 5 7 7-7 7" /></svg>
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