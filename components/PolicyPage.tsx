import Link from 'next/link';
import { buildBreadcrumb, jsonLdScript } from '@/lib/seo';

export type PolicySection = { heading?: string; body: string[] };

/**
 * Shared layout for the legal / "good to know" content pages (shipping,
 * returns, warranty, privacy, terms). Renders in the site's prose theme so
 * every policy page is consistent and fully on-brand.
 */
export default function PolicyPage({
  title,
  eyebrow = 'Good to Know',
  intro,
  sections,
  slug,
}: {
  title: string;
  eyebrow?: string;
  intro?: string;
  sections: PolicySection[];
  slug: string;
}) {
  const breadcrumb = buildBreadcrumb([
    { name: 'Home', url: '/' },
    { name: title, url: `/${slug}` },
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
          <span>{title}</span>
        </nav>

        <section className="prose-hero">
          <span className="section-eyebrow">{eyebrow}</span>
          <h1 className="section-title">{title}</h1>
        </section>

        <article className="prose-body">
          {intro && <p className="prose-lead">{intro}</p>}
          {sections.map((s, i) => (
            <section key={i} className="prose-section">
              {s.heading && <h2 className="prose-h2">{s.heading}</h2>}
              {s.body.map((p, j) => (
                <p key={j}>{p}</p>
              ))}
            </section>
          ))}
        </article>

        <section className="prose-cta">
          <p>Questions? We&apos;re here to help.</p>
          <div className="prose-cta-actions">
            <a href="mailto:care@danhov.com" className="btn-primary">Email care@danhov.com</a>
            <a href="tel:+14244214072" className="btn-solid">(424) 421-4072</a>
          </div>
        </section>
      </main>
    </>
  );
}
