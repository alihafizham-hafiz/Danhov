import type { Metadata } from 'next';
import Link from 'next/link';
import { buildFAQ, buildBreadcrumb, jsonLdScript } from '@/lib/seo';
import PageBlocks from '@/components/PageBlocks';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description:
    'Answers about DANHOV custom orders, metals (14k and 18k gold), sizing, lifetime warranty, shipping, and returns. Handcrafted in Los Angeles since 1984.',
  alternates: { canonical: '/faq' },
};

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'Which metals does DANHOV work in?',
    a: 'DANHOV specializes exclusively in 14-karat (58.5%) and 18-karat (75%) gold, available in three colors: yellow, white, and rose. We do not work in platinum, silver, or palladium. White-gold pieces are rhodium-plated for brightness; the first re-plating is complimentary.',
  },
  {
    q: 'How is the price calculated?',
    a: 'Every product page shows a live price computed against today\'s 24-karat gold spot price. The price is calculated from the piece\'s gold weight, purity, stones, and craftsmanship. You can lock the displayed price for 24 hours with just your email — no deposit required to lock — and the locked price is guaranteed regardless of market movement.',
  },
  {
    q: 'How long does production take?',
    a: 'Every piece is made to order in our Los Angeles atelier — typically 3 weeks from confirmed order. Rush orders are considered case-by-case.',
  },
  {
    q: 'Can I customize the ring?',
    a: 'Yes. We accommodate any size (including half- and quarter-sizes), any metal choice (14k or 18k in yellow / white / rose), stone selection (natural or lab-grown diamonds; other gemstones available), and complimentary engraving inside the band up to 25 characters.',
  },
  {
    q: 'What is the warranty?',
    a: 'Every DANHOV piece carries a lifetime craftsmanship warranty. Re-tipping, polishing, and sizing adjustments are complimentary in the first year and modestly priced thereafter. We also offer complimentary professional cleaning every 6–12 months on DANHOV-purchased pieces.',
  },
  {
    q: 'How does shipping work?',
    a: 'Domestic (US) shipping is complimentary, fully insured, via FedEx Priority Overnight with signature required. International shipments are hand-delivered where possible, fully insured. Production plus shipping is typically 3 weeks from confirmed order.',
  },
  {
    q: 'What about returns?',
    a: 'Non-customized pieces carry a 30-day return policy with full refund to the original payment method. Customized or personalized pieces are evaluated case-by-case — please reach out directly. One complimentary resizing is included within 60 days of delivery.',
  },
  {
    q: 'Where is DANHOV located?',
    a: 'DANHOV was founded in Los Angeles, California in 1984 by master jeweler Jack Hovsepian. Our atelier remains in Los Angeles, where every piece is handcrafted to order. Private appointments are available at the atelier.',
  },
  {
    q: 'Is DANHOV jewelry sustainable?',
    a: 'Yes. DANHOV is ranked the #1 Most Sustainable Jewelry Brand. All our gold is recycled — we do not use newly-mined gold. All diamonds and gemstones are conflict-free and ethically traced. 1% of every purchase funds reforestation and global clean-water initiatives.',
  },
  {
    q: 'How do I book a private consultation?',
    a: 'Use the "Book Appointment" button at the top of the site, or visit the appointment section on the homepage. Consultations are 30 minutes, held privately over Zoom with a DANHOV specialist, with the Zoom link arriving by email upon booking. No payment is required to book.',
  },
];

export default function FAQPage() {
  const breadcrumb = buildBreadcrumb([
    { name: 'Home', url: '/' },
    { name: 'FAQ', url: '/faq' },
  ]);
  const faqLd = buildFAQ(FAQ_ITEMS);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(breadcrumb)}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(faqLd)}
      />

      <main className="faq-page">
        <nav className="product-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span className="bc-sep">/</span>
          <span>Frequently Asked Questions</span>
        </nav>

        <section className="faq-hero">
          <span className="section-eyebrow">A quiet conversation</span>
          <h1 className="section-title">Questions, <em>answered</em></h1>
          <p className="section-body">
            Everything you might wonder before commissioning a DANHOV piece — metals, sizing,
            timing, warranty, and the way we work.
          </p>
        </section>

        <section className="faq-list">
          {FAQ_ITEMS.map((item, i) => (
            <details key={i} className="faq-item">
              <summary className="faq-question">{item.q}</summary>
              <p className="faq-answer">{item.a}</p>
            </details>
          ))}
        </section>

        <PageBlocks pageSlug="faq" />

        <section className="faq-footer">
          <p>Still have a question?</p>
          <Link href="/#appointment" className="btn-primary">
            Book a Private Consultation
          </Link>
        </section>
      </main>
    </>
  );
}
