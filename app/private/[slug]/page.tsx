import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabaseAnon } from '@/lib/supabase/anon';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type PresentationPayload = {
  title?: string;
  body?: string;
  products?: { sku: string; name: string; image?: string | null; price_usd?: number; metal?: string }[];
  cta_text?: string;
  cta_href?: string;
  signature?: string;
};

export async function generateMetadata({ params: _params }: { params: { slug: string } }) {
  return {
    title: 'A Private DANHOV Presentation',
    robots: { index: false, follow: false },
  };
}

export default async function PrivatePresentationPage({
  params,
}: {
  params: { slug: string };
}) {
  // RLS allows anon read while expires_at is null or > now()
  const { data: link } = await supabaseAnon
    .from('presentation_links')
    .select('id, slug, customer_email, payload, expires_at, viewed_at')
    .eq('slug', params.slug)
    .maybeSingle();

  if (!link) notFound();

  // Best-effort: record the first view (service-role bypasses RLS)
  if (!link.viewed_at) {
    void (async () => {
      const { error } = await createServiceClient()
        .from('presentation_links')
        .update({ viewed_at: new Date().toISOString() })
        .eq('id', link.id);
      if (error) console.error('presentation viewed_at update', error);
    })();
  }

  const payload: PresentationPayload = (link.payload as PresentationPayload) || {};

  return (
    <main className="presentation">
      <header className="presentation-header">
        <span className="presentation-mark">DANHOV · Private</span>
        <h1 className="presentation-title">
          {payload.title ?? 'A piece, prepared for you.'}
        </h1>
        {link.customer_email && (
          <span className="presentation-recipient">
            Prepared exclusively for {link.customer_email}
          </span>
        )}
      </header>

      {payload.body && (
        <p className="presentation-body">{payload.body}</p>
      )}

      {payload.products && payload.products.length > 0 && (
        <section className="presentation-grid">
          {payload.products.map((p) => (
            <article key={p.sku} className="presentation-card">
              <div className="presentation-card-img">
                {p.image ? (
                  <Image
                    src={p.image}
                    alt={p.name}
                    width={520}
                    height={520}
                    className="presentation-card-real"
                  />
                ) : (
                  <div className="presentation-card-fallback">
                    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <circle cx="40" cy="40" r="28" stroke="#AC3438" strokeWidth="1.5" />
                      <circle cx="40" cy="40" r="18" stroke="rgba(172,52,56,0.5)" strokeWidth="1" />
                      <circle cx="40" cy="40" r="8" stroke="#AC3438" strokeWidth="0.8" />
                    </svg>
                  </div>
                )}
              </div>
              <h3 className="presentation-card-name">{p.name}</h3>
              <span className="presentation-card-sku">Style {p.sku}</span>
              {p.metal && (
                <span className="presentation-card-metal">in {p.metal.replace(/_/g, ' ')}</span>
              )}
              {typeof p.price_usd === 'number' && (
                <span className="presentation-card-price">${p.price_usd.toLocaleString('en-US')}</span>
              )}
            </article>
          ))}
        </section>
      )}

      {payload.cta_text && payload.cta_href && (
        <div className="presentation-cta">
          <Link href={payload.cta_href} className="btn-primary">
            {payload.cta_text}
          </Link>
        </div>
      )}

      <footer className="presentation-footer">
        <em>{payload.signature ?? '— Jack & the DANHOV Atelier'}</em>
      </footer>
    </main>
  );
}
