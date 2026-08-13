import type { Metadata } from 'next';
import Link from 'next/link';
import { buildBreadcrumb, jsonLdScript } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Our Story',
  description:
    'Founded in 1984 by Jack Hovsepian, DANHOV is an award-winning designer of handcrafted engagement rings, wedding bands, and fine jewelry — each piece begun from a single wire in Los Angeles.',
  alternates: { canonical: '/story' },
};

// Adapted from danhov.com/about, set in our theme.
const STORY: { kind: 'lead' | 'body'; text: string }[] = [
  {
    kind: 'lead',
    text: 'Located in Los Angeles, California, DANHOV is an award-winning designer of unique and handcrafted engagement rings, wedding bands, and fine jewelry.',
  },
  {
    kind: 'body',
    text: 'Founded in 1984 by Jack Hovsepian, DANHOV is known in the luxury jewelry category for its innovative design philosophy. The designs of our custom-made engagement rings and wedding bands ensure that every DANHOV customer wears a special ring that is an extension and personal statement of their discerning taste.',
  },
  {
    kind: 'body',
    text: "Jack learned at an early age how to marry precision with art. Shadowing his father, an accomplished fashion designer, he spent his formative years exposed to trend-setting haute couture. This influence now drives his passion to design each ring with exacting measures and create the world's most exquisite collection of bridal jewelry.",
  },
  {
    kind: 'body',
    text: 'Each ring created by DANHOV is either handcrafted or hand-assembled by the most skilled jewelers at our Los Angeles atelier. This further exemplifies the precision and individuality for which DANHOV is known. Unlike many jewelry companies, no molds and mass-production assembly lines are used at DANHOV.',
  },
  {
    kind: 'body',
    text: "Each ring begins with a single wire and is shaped to perfection by DANHOV's artisan craftsmen. This preserves the quality and unique intricacies that only handmade and hand-assembled pieces can show. All DANHOV jewelry is covered by a lifetime manufacturer's warranty that covers any manufacturing defects.",
  },
  {
    kind: 'body',
    text: 'In addition to being made in the U.S., the process of creating rings at DANHOV is eco-friendly because it avoids the harsh chemicals and large machinery commonly used in traditional molding and manufacturing processes.',
  },
];

export default function StoryPage() {
  const breadcrumb = buildBreadcrumb([
    { name: 'Home', url: '/' },
    { name: 'Our Story', url: '/story' },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(breadcrumb)}
      />

      <main className="prose-page">
        <nav className="product-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span className="bc-sep">/</span>
          <span>Our Story</span>
        </nav>

        <section className="prose-hero">
          <span className="section-eyebrow">DANHOV — Est. 1984, Los Angeles</span>
          <h1 className="section-title">Our <em>story</em></h1>
        </section>

        <article className="prose-body">
          {STORY.map((p, i) => (
            <p key={i} className={p.kind === 'lead' ? 'prose-lead' : undefined}>
              {p.text}
            </p>
          ))}

          <div className="prose-signature">
            <span>Jack Hovsepian</span>
            <span className="prose-signature-sub">Founder, DANHOV</span>
          </div>
        </article>

        <section className="prose-cta">
          <p>Begin your own DANHOV piece.</p>
          <div className="prose-cta-actions">
            <Link href="/engagement-rings" className="btn-primary">Explore Engagement Rings</Link>
            <Link
              href="https://calendly.com/jack-70/30min"
              className="btn-solid"
              target="_blank"
              rel="noopener noreferrer"
            >
              Book a Consultation
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
