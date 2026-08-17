'use client';

import { useRouter } from 'next/navigation';
import MetalSwatches from '@/components/MetalSwatches';
import { useMetal } from '@/components/MetalContext';
import { requiresCenterStone } from '@/lib/product-purchase-mode';

type Props = {
  sku: string;
  slug: string;
  name: string;
  collection: string | null;
  centreDiamondGroup: { count?: number | null } | null;
  metals: string[];
  defaultMetal: string | null;
  images: string[];
  price_display: string | null;
  /** Live-computed prices keyed by metal key (e.g. '18k_yellow' → 5390). */
  pricemap?: Record<string, number>;
};


export default function ProductOptions({
  sku: _sku,
  slug,
  name: _name,
  collection: _collection,
  centreDiamondGroup,
  metals,
  defaultMetal: _defaultMetal,
  images: _images,
  price_display,
  pricemap = {},
}: Props) {
  const router = useRouter();
  const { selectedMetal, setSelectedMetal } = useMetal();
  const metal = selectedMetal;
  const setMetal = setSelectedMetal;

  // metal is already in key format ('platinum', '14k_yellow', etc.) — pricemap uses the same keys.
  const livePrice = metal ? pricemap[metal] : undefined;
  const displayPrice = livePrice
    ? '$' + Math.round(livePrice).toLocaleString('en-US')
    : (price_display ?? null);

  function goToDiamond() {
    const params = new URLSearchParams();
    params.set('setting', slug);
    if (metal) params.set('metal', metal);
    router.push(`/ring-builder/diamond?${params.toString()}`);
  }

  function buyRingOnly() {
    const params = new URLSearchParams({ setting: slug });
    if (metal) params.set('metal', metal);
    if (!requiresCenterStone(centreDiamondGroup)) params.set('finished', '1');
    router.push(`/ring-builder/review?${params.toString()}`);
  }

  const isSetting = requiresCenterStone(centreDiamondGroup);

  return (
    <>
      <MetalSwatches
        metals={metals}
        selectedMetal={metal}
        onSelect={(m) => setMetal(m)}
      />

      {displayPrice && (
        <>
          <p className="product-price">{displayPrice}</p>
          <p className="product-price-note">
            {isSetting
              ? 'Includes the setting and listed accent diamonds. Centre diamond selected separately.'
              : 'Includes the finished piece and all listed diamonds.'}
          </p>
        </>
      )}

      <div className="atb">
        {isSetting && <button type="button" className="atb-btn" onClick={goToDiamond}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Choose Your Diamond
        </button>}

        <button
          type="button"
          className="atb-btn atb-btn--secondary"
          onClick={buyRingOnly}
        >
          {isSetting ? 'Buy Setting Only' : 'Buy This Piece'}
        </button>

        <div className="atb-trust">
          <span>Made to order in Los Angeles</span>
          <span>·</span>
          <span>Lifetime craftsmanship warranty</span>
        </div>
      </div>
    </>
  );
}
