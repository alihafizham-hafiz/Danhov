'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { useRouter, usePathname } from 'next/navigation';
import './listingPage.css';
import ProductDetailModal from './ProductDetail';

export type SortOption = {
  value: string;
  label: string;
};

type FaqItem = {
  question: string;
  answer: string;
};

export type Product = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  collection: string | null;
  price_display: string | null;
  price_computed?: number;
  images: string[] | string;
  category: string;
  categories?: string[] | string;
  is_active: boolean;
  description?: string;
  metals?: string[] | string;
  default_metal?: string | null;
  metal_images?: Record<string, string[]> | string | null;
  gold_weight_g?: number | null;
  platinum_weight_g?: number | null;
  badge?: string;
};

type ListingPageProps = {
  title: string;
  subtitle: string;
  category?: string;
  categoryFilter?: string; // Included here to clear out the TypeScript error
  totalCount?: number;
  sortOptions?: SortOption[];
  sortValue?: string;
  onSortChange?: (value: string) => void;
  showPersonalize?: boolean;
  personalizeChecked?: boolean;
  onPersonalizeChange?: (checked: boolean) => void;
  activeFilterCount?: number;
  collections?: { label: string; value: string }[];
  showMetalFilter?: boolean;
  eyebrow?: string;
  aiPrompt?: string;
  philosophyStripe?: { quote: string };
  products?: Product[]; // Pre-fetched products coming from your server page
  initialCollection?: string;
  cardHref?: (slug: string) => string;
  showWishlist?: boolean;
  showLifePathTeaser?: boolean;
};

const DEFAULT_SORT_OPTIONS: SortOption[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
];

const PRODUCTS_PER_PAGE = 12;

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "How do I layer necklaces without them tangling?",
    answer: "Layering works best when each necklace sits at a distinct length..."
  },
];

const DEFAULT_PRICE_MAX = 89000;

const normalizeFilterValue = (value: string) =>
  value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');

const parseStringList = (value: string[] | string | undefined): string[] => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    // Fall back to the comma-separated format used by older product records.
  }
  return value.split(',');
};

function ListingFaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const toggleAccordion = (index: number) => setOpenIndex(openIndex === index ? null : index);

  const schemaData = {
    "@context": "http://schema.org",
    "@type": "FAQPage",
    "mainEntity": FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": { "@type": "Answer", "text": item.answer }
    }))
  };

  return (
    <div className="experience-component experience-commerce_layouts-accordionSection dnh-faq-wrapper">
      <div className="accordion-container">
        <div className="secondary-title accordion-section-title text-center h4">
          <h2>Frequently Asked Questions</h2>
        </div>
        <div className="accordion-section collapse-accordion-container js-accordion-section" data-is-faq="true">
          <div className="accordion-inner">
            <div className="collapse-accordion">
              {FAQ_ITEMS.map((item, index) => {
                const isOpen = openIndex === index;
                return (
                  <div key={index} className={`js-accordion-item collapsible-xxl collapsible-transition ${isOpen ? 'active' : ''}`}>
                    <div className="collapsible-header white">
                      <button type="button" className="title body_serif_16_p text-size-lg text-left accordion-item w-100" onClick={() => toggleAccordion(index)}>
                        <span>{item.question}</span>
                        <span className={`dnh-faq-arrow ${isOpen ? 'is-open' : ''}`}>↓</span>
                      </button>
                    </div>
                    {isOpen && (
                      <div className="collapsible-body-wrapper">
                        <div className="collapsible-body-inner">
                          <div className="collapsible-body pb-0 white">
                            <div className="pb-40"><div className="accordion-content text-size-md body_14">{item.answer}</div></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <Script id="SchemaFAQ" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }} />
    </div>
  );
}

export default function ListingPage({
  title,
  subtitle,
  sortOptions = DEFAULT_SORT_OPTIONS,
  sortValue = 'featured',
  onSortChange,
  showPersonalize = true,
  personalizeChecked = false,
  onPersonalizeChange,
  products = [], // Use the pre-fetched products passed from the server
}: ListingPageProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [sortOpen, setSortOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PRODUCTS_PER_PAGE);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string>>({});

  const priceMaximum = Math.max(
    DEFAULT_PRICE_MAX,
    ...products.map((product) => product.price_computed ?? 0).filter((price) => Number.isFinite(price))
  );
  const [priceRange, setPriceRange] = useState(priceMaximum);

  const handleSelectProduct = (product: Product | null) => {
    setSelectedProduct(product);
    if (product) {
      router.push(`${pathname}?product=${product.slug}`, { scroll: false });
    } else {
      router.push(pathname, { scroll: false });
    }
  };

  // Sync modal state with URL parameters on load or back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const productSlug = params.get('product');
      if (!productSlug) {
        setSelectedProduct(null);
      } else if (products.length > 0) {
        const found = products.find((p) => p.slug === productSlug);
        if (found) setSelectedProduct(found);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [products]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const productSlug = params.get('product');
    if (productSlug && products.length > 0) {
      const found = products.find((p) => p.slug === productSlug);
      if (found) setSelectedProduct(found);
    }
  }, [products]);

  const activeLabel = sortOptions.find((option) => option.value === sortValue)?.label ?? 'Sort By';

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const getProductBrand = (product: Product) => product.collection || product.category || 'DANHOV';

  const getProductMetals = (product: Product): string[] => {
    const rawMetals = parseStringList(product.metals);

    return rawMetals
      .map((metal) => metal.trim())
      .filter(Boolean)
      .map((metal) => metal.replace(/_/g, ' '));
  };

  const getProductCategories = (product: Product): string[] => {
    const rawCategories = parseStringList(product.categories);

    return [...new Set([product.category, ...rawCategories].filter(Boolean).map((category) => category.trim()))];
  };

  const getProductPriceValue = (product: Product) => {
    if (typeof product.price_computed === 'number' && Number.isFinite(product.price_computed)) {
      return product.price_computed;
    }
    if (!product.price_display) return 0;
    const numericValue = Number(String(product.price_display).replace(/[^0-9.]/g, ''));
    return Number.isFinite(numericValue) ? numericValue : 0;
  };

  const filterGroups = {
    collection: [...new Set(products.map((product) => getProductBrand(product)).filter(Boolean))],
    category: [...new Set(products.flatMap((product) => getProductCategories(product)))],
    metal: [...new Set(products.flatMap((product) => getProductMetals(product)))],
  };

  const handleFilterChange = (group: string, value: string) => {
    setSelectedFilters((previous) => {
      const next = { ...previous };
      if (next[group] === value) {
        delete next[group];
        return next;
      }
      next[group] = value;
      return next;
    });
  };

  const clearAllFilters = () => {
    setSelectedFilters({});
    setPriceRange(priceMaximum);
  };

  const filterCount = Object.keys(selectedFilters).length + (priceRange < priceMaximum ? 1 : 0);

  // Helper to safely extract image arrays stored as text or json in Supabase
  const getProductImage = (product: Product, index: number) => {
    try {
      const imgs = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
      if (Array.isArray(imgs) && imgs.length > index) {
        return imgs[index];
      }
    } catch (e) {
      console.error('Error parsing images', e);
    }
    return '/products/product-1.png';
  };

  const filteredProducts = products.filter((product) => {
    const brandValue = getProductBrand(product).toLowerCase();
    const categoryValues = getProductCategories(product).map(normalizeFilterValue);
    const metalsValue = getProductMetals(product).map(normalizeFilterValue);
    const priceValue = getProductPriceValue(product);

    const collectionMatch = !selectedFilters.collection || normalizeFilterValue(brandValue) === normalizeFilterValue(selectedFilters.collection);
    const categoryMatch = !selectedFilters.category || categoryValues.includes(normalizeFilterValue(selectedFilters.category));
    const metalMatch = !selectedFilters.metal || metalsValue.includes(normalizeFilterValue(selectedFilters.metal));
    const priceMatch = priceValue <= priceRange;

    return collectionMatch && categoryMatch && metalMatch && priceMatch;
  });

  useEffect(() => {
    setVisibleCount(PRODUCTS_PER_PAGE);
  }, [selectedFilters, priceRange, products.length]);

  const displayedProducts = filteredProducts.slice(0, visibleCount);

  const handleViewMore = () => {
    setVisibleCount((prev) => Math.min(prev + PRODUCTS_PER_PAGE, filteredProducts.length));
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main className="dnh-listing-page">
      {/* BANNER HERO */}
      <section className="dnh-banner">
        <div className="dnh-banner-bg" style={{ backgroundImage: `url(/Banner_listing.jpeg)` }} />
        <div className="dnh-banner-content">
          <h1 className="dnh-banner-title">{title}</h1>
          <p className="dnh-banner-subtitle">{subtitle}</p>
        </div>
      </section>

      {/* TOOLBAR */}
      <div className="dnh-toolbar">
        <div className="dnh-toolbar-sort">
          <button type="button" className="dnh-toolbar-sort-btn" onClick={() => setSortOpen((open) => !open)}>
            <span>{activeLabel}</span>
          </button>
          {sortOpen && (
            <>
              <div className="dnh-toolbar-sort-backdrop" onClick={() => setSortOpen(false)} />
              <ul className="dnh-toolbar-sort-menu">
                {sortOptions.map((option) => (
                  <li key={option.value}>
                    <button type="button" className={sortValue === option.value ? 'is-active' : ''} onClick={() => { onSortChange?.(option.value); setSortOpen(false); }}>
                      {option.label}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <span className="dnh-toolbar-count">{products.length} Products</span>
        <h2 className="dnh-toolbar-title">{title}</h2>

        {showPersonalize && (
          <label className="dnh-toolbar-personalize">
            <input type="checkbox" checked={personalizeChecked} onChange={(e) => onPersonalizeChange?.(e.target.checked)} />
            <span>Personalize</span>
          </label>
        )}

        <button type="button" className="dnh-toolbar-filters-btn" onClick={() => setDrawerOpen(true)}>
          <span>Filters</span>
          {filterCount > 0 && <span className="dnh-toolbar-filters-badge">{filterCount}</span>}
        </button>
      </div>

      {/* PRODUCT GRID */}
      <section className="dnh-product-section">
        <div className="dnh-product-grid">
          {displayedProducts.map((product) => {
            const mainImg = getProductImage(product, 0);
            const hoverImg = getProductImage(product, 1) || mainImg;
            const productBrand = getProductBrand(product);

            return (
              <article className="dnh-product-card" key={product.id} onClick={() => handleSelectProduct(product)} style={{ cursor: 'pointer' }}>
                <div className="dnh-product-image">
                  <span className="dnh-product-badge">{productBrand}</span>
                  <img src={mainImg} alt={product.name} className="dnh-product-img dnh-product-img-main" />
                  <img src={hoverImg} alt="" aria-hidden="true" className="dnh-product-img dnh-product-img-hover" />
                  <button type="button" className="dnh-product-wishlist" aria-label="Add to wishlist">♡</button>
                </div>

                <div className="dnh-product-info">
                  <h3 className="dnh-product-name">{product.name}</h3>
                  <div className="dnh-product-price">{product.price_display}</div>
                </div>
              </article>
            );
          })}
        </div>

        {/* PAGINATION */}
        <div className="dnh-pagination-container">
          <div className="dnh-pagination-status">Showing 1 - {displayedProducts.length} of {filteredProducts.length}</div>
          {visibleCount < filteredProducts.length && (
            <button type="button" className="dnh-view-more-btn dnh-slide-btn" onClick={handleViewMore}>VIEW MORE</button>
          )}
          <button type="button" className="dnh-back-to-top-btn" onClick={scrollToTop}>BACK TO TOP</button>
        </div>
      </section>

      <ListingFaqSection />

      {/* FILTER DRAWER */}
      <div className={`dnh-drawer-backdrop ${drawerOpen ? 'is-open' : ''}`} onClick={() => setDrawerOpen(false)} />
      <aside className={`dnh-drawer ${drawerOpen ? 'is-open' : ''}`}>
        <div className="dnh-drawer-header">
          <span>Filters</span>
          <button type="button" className="dnh-drawer-close" onClick={() => setDrawerOpen(false)}>×</button>
        </div>
        <div className="dnh-drawer-body">
          <details className="dnh-plp-filter-group" open>
            <summary>Collection</summary>
            <div className="dnh-plp-filter-options">
              {filterGroups.collection.map((option) => (
                <label key={option} className="dnh-plp-filter-option">
                  <input
                    type="radio"
                    name="collection"
                    checked={selectedFilters.collection === option}
                    onChange={() => handleFilterChange('collection', option)}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </details>

          <details className="dnh-plp-filter-group" open>
            <summary>Category</summary>
            <div className="dnh-plp-filter-options">
              {filterGroups.category.map((option) => (
                <label key={option} className="dnh-plp-filter-option">
                  <input
                    type="radio"
                    name="category"
                    checked={selectedFilters.category === option}
                    onChange={() => handleFilterChange('category', option)}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </details>

          <details className="dnh-plp-filter-group" open>
            <summary>Metal</summary>
            <div className="dnh-plp-filter-options">
              {filterGroups.metal.map((option) => (
                <label key={option} className="dnh-plp-filter-option">
                  <input
                    type="radio"
                    name="metal"
                    checked={selectedFilters.metal === option}
                    onChange={() => handleFilterChange('metal', option)}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </details>

          <div className="dnh-price-filter">
            <details className="dnh-plp-filter-group" open>
              <summary>Price</summary>
              <div className="dnh-plp-filter-options">
                <div className="dnh-price-values">
                  <span>${Math.min(priceMaximum, priceRange).toLocaleString()}</span>
                  <span>${priceMaximum.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={priceMaximum}
                  step={500}
                  value={priceRange}
                  onChange={(event) => setPriceRange(Number(event.target.value))}
                  className="dnh-price-range"
                />
              </div>
            </details>
          </div>
        </div>
        <div className="dnh-drawer-footer">
          <button type="button" className="dnh-drawer-clear-btn" onClick={clearAllFilters}>Clear All</button>
          <button type="button" className="dnh-drawer-view-btn" onClick={() => setDrawerOpen(false)}>View Items</button>
        </div>
      </aside>

      <ProductDetailModal product={selectedProduct} onClose={() => handleSelectProduct(null)} />
    </main>
  );
}