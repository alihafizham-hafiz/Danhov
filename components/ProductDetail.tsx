'use client';

import { useEffect, useState } from 'react';
import { useCart } from '@/components/CartProvider';
import ProductGallery from '@/components/ProductGallery';
import { Product } from './ListingPage';
import './ProductDetail.css';

type ProductModalProps = {
  product: Product | null;
  onClose: () => void;
};

type AccordionItem = {
  title: string;
  content: string;
};

const PDP_ACCORDIONS: AccordionItem[] = [
  { title: "Blue Box", content: "Every Danhov luxury creation is presented in an iconic presentation box..." },
  { title: "Complimentary Shipping & Returns", content: "We offer complimentary shipping and insured returns..." },
  { title: "Ask a Client Advisor", content: "Experience personalized service tailored to your every need..." },
  { title: "Responsibly Sourced", content: "Dedicated efforts to responsibly source precious metals and diamonds." },
  { title: "Size Guide", content: "Determine correct bracelet, necklace, or ring sizing." },
  { title: "Visit a Store", content: "Visit an authorized Danhov partner boutique." }
];

export default function ProductDetailModal({ product, onClose }: ProductModalProps) {
  const { addItem } = useCart();
  const [openAccordion, setOpenAccordion] = useState<number | null>(0);
  const [addedMessage, setAddedMessage] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string>(product?.default_metal || '');
  const [isZoomed, setIsZoomed] = useState(false);

  const safeProduct = product;
  const defaultMetal = safeProduct?.default_metal || '';

  // Safely parse image array from Supabase column
  let images: string[] = [];
  try {
    images = safeProduct && typeof safeProduct.images === 'string' ? JSON.parse(safeProduct.images) : (safeProduct?.images ?? []);
  } catch (e) {
    images = ['/Vedios/Packaging.mp4'];
  }

  const cleanedImages = images.filter((img) => !!img && img.trim() !== '');

  const parsedMetalImages = (() => {
    if (!safeProduct?.metal_images) return {} as Record<string, string[]>;
    if (typeof safeProduct.metal_images === 'string') {
      try {
        return JSON.parse(safeProduct.metal_images) as Record<string, string[]>;
      } catch {
        return {} as Record<string, string[]>;
      }
    }
    return safeProduct.metal_images as Record<string, string[]>;
  })();

  const rawMetals = Array.isArray(safeProduct?.metals)
    ? safeProduct.metals
    : typeof safeProduct?.metals === 'string'
      ? safeProduct.metals.split(',').map((m) => m.trim()).filter(Boolean)
      : [];

  const metalOptions = Object.entries(parsedMetalImages)
    .filter(([_, value]) => Array.isArray(value) && value.some(Boolean))
    .map(([metal, value]) => ({
      value: metal,
      label: metal.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
      image: (value as string[]).find((img) => !!img && img.trim() !== '') ?? null,
    }));

  const fallbackOptions = (rawMetals.length ? rawMetals : (defaultMetal ? [defaultMetal] : [])).map((metal) => ({
    value: metal,
    label: metal.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
    image: null,
  }));

  const productVariationOptions = metalOptions.length > 0 ? metalOptions : fallbackOptions;

  useEffect(() => {
    if (!safeProduct || !productVariationOptions.length) return;
    const hasSelected = productVariationOptions.some((option) => option.value === selectedOption);
    if (!hasSelected) {
      setSelectedOption(defaultMetal || productVariationOptions[0].value);
    }
  }, [safeProduct, productVariationOptions, selectedOption, defaultMetal]);

  const selectedVariant = productVariationOptions.find((option) => option.value === selectedOption)
    ?? productVariationOptions[0]
    ?? null;

  const selectedVariantImage = selectedVariant?.image || cleanedImages[0] || '/products/product-1.png';

  const selectedVariantPrice = safeProduct?.price_display || '—';
  const productDetails = safeProduct ? [
    { label: 'Collection', value: safeProduct.collection || '—' },
    { label: 'Category', value: safeProduct.category || '—' },
    { label: 'SKU', value: safeProduct.sku || '—' },
    { label: 'Material', value: selectedVariant?.label || safeProduct.default_metal || (Array.isArray(safeProduct.metals) ? safeProduct.metals.join(', ') : safeProduct.metals || '—') },
    { label: 'Gold weight', value: typeof safeProduct.gold_weight_g === 'number' && !Number.isNaN(safeProduct.gold_weight_g) ? `${safeProduct.gold_weight_g} g` : '—' },
    { label: 'Platinum weight', value: typeof safeProduct.platinum_weight_g === 'number' && !Number.isNaN(safeProduct.platinum_weight_g) ? `${safeProduct.platinum_weight_g} g` : '—' },
    { label: 'Status', value: safeProduct.is_active ? 'Active' : 'Inactive' },
    { label: 'Price', value: selectedVariantPrice },
  ].filter((detail) => detail.value && detail.value !== '—') : [];

  const toggleAccordion = (index: number) => {
    setOpenAccordion(openAccordion === index ? null : index);
  };

  const handleAddToCart = () => {
    if (!safeProduct) return;
    const chosenMetal = selectedOption || safeProduct.default_metal || 'platinum';
    const variantKey = chosenMetal;
    const variantPrice = parseFloat((safeProduct.price_display ?? '').replace(/[^0-9.]/g, '')) || 0;

    addItem({
      id: `${safeProduct.id}`,
      sku: safeProduct.sku,
      slug: safeProduct.slug,
      name: safeProduct.name,
      price_num: variantPrice,
      price_display: safeProduct.price_display,
      image: selectedVariantImage,
      collection: safeProduct.collection || '',
      metal: chosenMetal,
      variant_key: variantKey,
      variant_label: selectedVariant?.label || chosenMetal,
      qty: 1,
    });

    setAddedMessage(true);
    setTimeout(() => setAddedMessage(false), 2000);
  };

  if (!safeProduct) return null;

  return (
    <div className="dnh-pdp-modal-backdrop" onClick={onClose}>
      <div className="dnh-pdp-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dnh-pdp-modal-header">
          <button type="button" className="dnh-pdp-close-btn" onClick={onClose} aria-label="Close modal">×</button>
        </div>

        <div className="dnh-pdp-modal-body">
          <div className="dnh-pdp-cols">
            
            {/* Left Column: Details & Actions */}
            <div className="dnh-pdp-col-details-sticky">
              <div className="dnh-pdp-title-section">
                <h1 className="dnh-pdp-name">{product.name}</h1>
                <div className="dnh-pdp-brand-badge">{product.collection || product.category}</div>
                <div className="dnh-pdp-price">{selectedVariantPrice}</div>

                {productVariationOptions.length > 0 && (
                  <div className="dnh-pdp-option-wrap">
                    <span className="dnh-pdp-option-label">Available variations</span>
                    {productVariationOptions.some((option) => option.image) ? (
                      <div className="dnh-pdp-option-grid" role="group" aria-label="Product variation options">
                        {productVariationOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            className={`dnh-pdp-option-button ${selectedVariant?.value === option.value ? 'is-selected' : ''}`}
                            onClick={() => setSelectedOption(option.value)}
                            aria-pressed={selectedVariant?.value === option.value}
                          >
                            {option.image ? (
                              <img src={option.image} alt={option.label} className="dnh-pdp-option-thumb" />
                            ) : (
                              <span className="dnh-pdp-option-fallback" aria-hidden="true" />
                            )}
                            <span className="dnh-pdp-option-name">{option.label}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <select
                        className="dnh-pdp-option-select"
                        value={selectedVariant?.value || ''}
                        onChange={(event) => setSelectedOption(event.target.value)}
                      >
                        {productVariationOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>

              <div className="dnh-pdp-attributes">
                <div className="dnh-pdp-attribute-row">
                  <span className="dnh-pdp-attr-label">SKU: {product.sku}</span>
                </div>

                <div className="dnh-pdp-actions">
                  <button type="button" className="dnh-pdp-btn-black dnh-slide-btn" onClick={handleAddToCart}>
                    <span>{addedMessage ? 'Added to Cart ✓' : 'Add to cart'}</span>
                  </button>
                  <button type="button" className="dnh-pdp-btn-champagne dnh-slide-btn">
                    <span>Contact your advisor</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Main product image, description, and gallery */}
            <div className="dnh-pdp-col-image">
              <div
                className={`dnh-pdp-main-image-wrap ${isZoomed ? 'is-zoomed' : ''}`}
                onClick={() => setIsZoomed((value) => !value)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setIsZoomed((value) => !value);
                  }
                }}
                aria-label="Toggle product image zoom"
              >
                <img src={selectedVariantImage} alt={product.name} className="dnh-pdp-main-img" />
                <span className="dnh-pdp-zoom-hint">{isZoomed ? 'Click to zoom out' : 'Click to zoom'}</span>
              </div>

              <div className="dnh-pdp-static-description">
                <h2 className="dnh-pdp-section-title">About this piece</h2>
                <p className="dnh-pdp-desc-text">
                  {product.description || `${product.name} is a handcrafted DANHOV design created with meticulous attention to proportion, finish, and lasting beauty.`}
                </p>

                {productDetails.length > 0 && (
                  <div className="dnh-pdp-meta-grid">
                    {productDetails.map((detail) => (
                      <div key={detail.label} className="dnh-pdp-meta-item">
                        <span className="dnh-pdp-meta-label">{detail.label}</span>
                        <span className="dnh-pdp-meta-value">{detail.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="dnh-pdp-gallery-block">
                <ProductGallery
                  images={images}
                  alt={product.name}
                  collection={product.collection || product.category}
                  fallbackImages={images}
                />
              </div>
            </div>

          </div>

          {/* Accordion Footer Section */}
          <div className="dnh-pdp-bottom-section">
            <div className="dnh-pdp-bottom-left-img">
              <video src="/Vedios/Packaging.mp4" controls muted playsInline preload="metadata" aria-label="Packaging" />
            </div>
            <div className="dnh-pdp-bottom-right-accordion">
              {PDP_ACCORDIONS.map((item, index) => {
                const isOpen = openAccordion === index;
                return (
                  <div key={index} className={`dnh-pdp-accordion-item ${isOpen ? 'active' : ''}`}>
                    <button type="button" className="dnh-pdp-accordion-header" onClick={() => toggleAccordion(index)}>
                      <span>{item.title}</span>
                      <span className={`dnh-accordion-arrow ${isOpen ? 'is-open' : ''}`}>⌄</span>
                    </button>
                    {isOpen && (
                      <div className="dnh-pdp-accordion-body">
                        <p>{item.content}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}