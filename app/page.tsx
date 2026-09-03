import type { Metadata } from 'next';
import Link from 'next/link';
import HomepageScripts from '@/components/HomepageScripts';
import HeroVideo from '@/components/HeroVideo';
import ScrollToHash from '@/components/ScrollToHash';
import FindFormSection from '@/components/FindFormSection';
import CategoryCardsSection from '@/components/CategoryCardsSection';
import VideoSliderSection from '@/components/VideoSliderSection';
import PopularStylesSection from '@/components/PopularStylesSection';
import EditorialReverseSection from '@/components/EditorialReverseSection';
import EditorialSplitSection from '@/components/EditorialSplitSection';
import ShopByCategorySection from '@/components/ShopByCategorySection';
import DanhovExperienceSectin from '@/components/DanhovExperienceSectin';
import InvitationsMoreSection from '@/components/InvitationsMoreSection';
import Image from 'next/image';
import { fetchAllActiveProducts } from '@/lib/products';
import {
  buildLocalBusiness,
  buildWebSite,
  jsonLdScript,
} from '@/lib/seo';
import { normalizePopularStyleProducts } from '@/lib/popular-styles';

export const metadata: Metadata = {
  title: 'Handcrafted Luxury Jewelry · Los Angeles · Est. 1984',
  description:
    'Discover DANHOV — luxury handcrafted engagement rings, wedding bands, and fine jewelry in 14k or 18k gold. Made to order in Los Angeles since 1984. Lifetime craftsmanship warranty.',
  alternates: { canonical: '/' },
};

export const revalidate = 300;

export default async function HomePage() {
  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL || 'https://calendly.com/jack-70/30min';
  const featuredProducts = normalizePopularStyleProducts(await fetchAllActiveProducts());

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(buildLocalBusiness())}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(buildWebSite())}
      />

      <HomepageScripts />
      <ScrollToHash />

      {/* ──STYLE HERO SECTION ───────────────────────────── */}
      <section className="hero hero-cine">
        <HeroVideo />
        {/* Veil — keeps the headline legible over the video */}
        <div className="hero-cine-veil" aria-hidden="true" />

        <div className="hero-content hero-cine-inner">
          <span className="ch-silence">The Master Collection</span>
          
          <h1 className="hero-headline">
            <span className="ch-line ch-headline" id="chLine1">
              Love is remembering.
            </span>
          </h1>
          
          <div className="hero-rule visible" id="chDiv" />
          
          <p className="ch-line ch-philosophy" id="chLine3">
           You Already Are One.
          </p>

          <div className="hero-cine-ctas" id="heroFounder">
            <Link href="/engagement-rings" className="  hero-cine-cta hero-cine-cta--white">
              Shop The Collection
            </Link>
            
          </div>
        </div>
      </section>
      <VideoSliderSection/>
      <PopularStylesSection products={featuredProducts} />
      
      <EditorialSplitSection />
      <ShopByCategorySection/>
      <EditorialReverseSection />
      <DanhovExperienceSectin/>
      <div id="appointment" />
      
    </>
  );
}