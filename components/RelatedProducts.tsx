import Link from 'next/link';
import Image from 'next/image';
import { fetchRelatedProducts } from '@/lib/products';
import { stripMetalSuffix } from '@/lib/product-display';

type Props = {
  currentSlug: string;
  collection: string | null;
  category: string;
};

export default async function RelatedProducts({ currentSlug, collection, category }: Props) {
  const products = await fetchRelatedProducts(currentSlug, collection, category, 4);
  if (products.length === 0) return null;

  return (
    <section className="related-section">
      <div className="related-header">
        <span className="section-eyebrow">You May Also Like</span>
        <h2 className="related-title">
          {collection ? `More from ${collection}` : 'Related Pieces'}
        </h2>
      </div>

      <div className="related-track">
        {products.map((p) => {
          const rawImg = p.images?.[0] ?? null;
          // Encode any unencoded spaces in the URL path so Next.js Image can resolve it
          const img = rawImg
            ? rawImg.replace(/^(https?:\/\/[^/]+)(\/.*)?$/, (_, origin, path) =>
                origin + (path ? path.split('/').map((seg: string) => encodeURIComponent(decodeURIComponent(seg))).join('/') : '')
              )
            : null;
          const name = stripMetalSuffix(p.name);
          return (
            <Link key={p.slug} href={`/product/${p.slug}`} className="related-card">
              <div className="related-card-media">
                {img ? (
                  <Image
                    src={img}
                    alt={name}
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 44vw, (max-width: 1024px) 22vw, 16vw"
                    style={{ objectFit: 'contain', padding: '16px' }}
                  />
                ) : (
                  <div className="related-card-placeholder">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                      <circle cx="24" cy="24" r="16" stroke="#AC3438" strokeWidth="1.2" />
                      <circle cx="24" cy="24" r="8" stroke="#AC3438" strokeWidth="0.7" opacity="0.4" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="related-card-info">
                {p.collection && (
                  <span className="related-card-collection">{p.collection}</span>
                )}
                <p className="related-card-name">{name}</p>
                {p.price_display && (
                  <p className="related-card-price">{p.price_display}</p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
