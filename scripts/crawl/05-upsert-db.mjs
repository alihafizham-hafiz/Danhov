/**
 * Stage 5 — write the crawled catalog into the products table.
 *
 * Source: data/crawl/catalog.json (3,747 rows = danhov product pages, with
 * images already pointing at our Supabase Storage URLs).
 *
 * Transform:
 *   • Dedup by SKU. danhov lists the same product page under both a section
 *     sweep (…/engagement-rings) and its collection page (…/abbraccio); those
 *     are byte-identical (same sku + images). We keep one row per SKU and
 *     merge every category/collection it appeared under.
 *   • slug = kebab(sku) — a SINGLE path segment. The app routes products via
 *     /product/[slug] and existing rows use slug = sku.toLowerCase(); the raw
 *     danhov slugs contain slashes and would break that route.
 *   • collection = display label (e.g. "Norme de DANHOV") so the listing-page
 *     filter chips (which map label → slug) work.
 *
 * Write strategy ("replace all", FK-safe):
 *   1. upsert every row on conflict(sku)
 *   2. delete any pre-existing product whose sku is NOT in the new set
 * Net effect: products table == danhov catalog, full-res images self-hosted.
 *
 * Run:  node scripts/crawl/05-upsert-db.mjs            (dry run: prints plan)
 *       node scripts/crawl/05-upsert-db.mjs --commit   (writes to DB)
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import { readState, writeState } from './lib.mjs';

config({ path: '.env.local' });
const COMMIT = process.argv.includes('--commit');

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
  realtime: { transport: ws },
});

// collection slug (from crawl) → display label (matches app COLLECTIONS labels)
const COLLECTION_LABEL = {
  'award-winners': 'Award Winners',
  'swirl-engagement-rings-abbraccio': 'Abbraccio',
  abbraccio: 'Abbraccio',
  carezza: 'Carezza',
  classico: 'Classico',
  couture: 'Couture',
  eleganza: 'Eleganza',
  'per-lei': 'Per Lei',
  petalo: 'Petalo',
  'solo-filo': 'Solo Filo',
  tubetto: 'Tubetto',
  unito: 'Unito',
  voltaggio: 'Voltaggio',
  'norme-de-danhov': 'Norme de DANHOV',
  perlina: 'Perlina',
  'her-bands': 'Her Bands',
  'his-bands': 'His Bands',
  bands: 'Bands',
  earrings: 'Earrings',
  online: 'Online',
  'pop-of-color': 'Pop of Color',
  rings: 'Rings',
  bracelet: 'Bracelet',
  'necklaces-pendants': 'Necklaces & Pendants',
};

// Known collection labels for name-based inference when a product only came
// through the section sweep (collection == null).
const NAME_COLLECTIONS = [
  'Abbraccio', 'Voltaggio', 'Classico', 'Norme de DANHOV', 'Carezza',
  'Per Lei', 'Petalo', 'Solo Filo', 'Eleganza', 'Couture', 'Unito',
  'Tubetto', 'Perlina',
];

function kebab(s) {
  return String(s).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Decode HTML entities the og:title carries (&#x20; spaces, &amp;, named, etc.). */
function decodeEntities(s) {
  if (!s) return s;
  return String(s)
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferCollectionFromName(name) {
  if (!name) return null;
  const lower = name.toLowerCase();
  for (const label of NAME_COLLECTIONS) {
    if (lower.includes(label.toLowerCase())) return label;
  }
  return null;
}

function main() {
  const catalog = readState('catalog.json', []);

  // Dedup by SKU (fallback to slug's last segment if sku missing).
  const bySku = new Map();
  for (const r of catalog) {
    const key = r.sku || r.slug.split('/').pop();
    const existing = bySku.get(key);
    if (!existing) {
      bySku.set(key, {
        sku: key,
        name: decodeEntities(r.name),
        category: r.category,
        categories: new Set([r.category]),
        collectionSlug: r.collection || null,
        price_display: r.price_display,
        description: decodeEntities(r.description),
        images: r.images,
        danhov_url: r.danhov_url,
      });
    } else {
      existing.categories.add(r.category);
      if (!existing.collectionSlug && r.collection) existing.collectionSlug = r.collection;
      if ((!existing.images || existing.images.length === 0) && r.images?.length) existing.images = r.images;
    }
  }

  const rows = [];
  let withImages = 0;
  let withCollection = 0;
  for (const p of bySku.values()) {
    let collection = p.collectionSlug ? COLLECTION_LABEL[p.collectionSlug] || null : null;
    if (!collection) collection = inferCollectionFromName(p.name);
    if (collection) withCollection++;
    if (p.images?.length) withImages++;

    rows.push({
      sku: p.sku,
      slug: kebab(p.sku),
      name: p.name,
      collection: collection ?? '', // column is NOT NULL; '' = no specific collection
      category: p.category,
      categories: [...p.categories],
      images: p.images || [],
      price_display: p.price_display ?? null,
      description: p.description ?? null,
      is_active: true,
    });
  }

  // Snapshot what we're about to write for inspection.
  writeState('db-rows.json', rows);

  const byCat = {};
  for (const r of rows) for (const c of r.categories) byCat[c] = (byCat[c] || 0) + 1;
  const totalImgs = rows.reduce((n, r) => n + r.images.length, 0);

  console.log(`${COMMIT ? '⚙  COMMIT' : '🔍 DRY RUN'} — ${rows.length} unique products (from ${catalog.length} catalog rows)`);
  console.log(`    with images:     ${withImages}`);
  console.log(`    with collection: ${withCollection}`);
  console.log(`    total image refs:${totalImgs}`);
  console.log('    by category (listings):');
  for (const [c, n] of Object.entries(byCat)) console.log(`      ${c.padEnd(12)} ${n}`);
  console.log('\n  sample row:');
  console.log('   ', JSON.stringify({ ...rows[0], images: [rows[0].images[0], '…(' + rows[0].images.length + ')'] }, null, 0));

  if (!COMMIT) {
    console.log('\n→ wrote data/crawl/db-rows.json. Re-run with --commit to write to the database.');
    return rows;
  }
  return commit(rows);
}

async function commit(rows) {
  const newSkus = new Set(rows.map((r) => r.sku));

  // 1) Pre-existing rows we'll prune (sku not in new set).
  const { data: existing, error: exErr } = await sb.from('products').select('sku');
  if (exErr) throw exErr;
  const stale = (existing || []).map((r) => r.sku).filter((s) => !newSkus.has(s));

  // 2) Upsert new rows in batches on conflict(sku).
  const BATCH = 500;
  let upserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const { error } = await sb.from('products').upsert(slice, { onConflict: 'sku' });
    if (error) {
      console.error(`✗ batch ${i / BATCH + 1} failed:`, error.message);
      process.exit(1);
    }
    upserted += slice.length;
    process.stdout.write(`  ✓ upserted ${upserted}/${rows.length}\n`);
  }

  // 3) Prune stale rows.
  let pruned = 0;
  if (stale.length) {
    for (let i = 0; i < stale.length; i += BATCH) {
      const slice = stale.slice(i, i + BATCH);
      const { error } = await sb.from('products').delete().in('sku', slice);
      if (error) console.error('✗ prune failed:', error.message);
      else pruned += slice.length;
    }
  }

  const { count } = await sb.from('products').select('*', { count: 'exact', head: true });
  console.log(`\n✓ DB write complete`);
  console.log(`    upserted: ${upserted}`);
  console.log(`    pruned:   ${pruned} stale rows`);
  console.log(`    products table now: ${count} rows`);
}

main();
