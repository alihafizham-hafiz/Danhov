/**
 * Stage 2 — fetch every product page, pull metadata + the full-resolution
 * gallery. Resumable: skips URLs already present in galleries.json.
 *
 * Per product:
 *   sku       ← data-product-sku
 *   name      ← <title> (DANHOV prefix kept, " | DANHOV" suffix trimmed)
 *   price     ← <meta property="product:price:amount">
 *   desc      ← <meta name="description">
 *   images[]  ← every gallery "full":"…" URL, JSON-unescaped, cache-stripped
 *               to the original-resolution upload, deduped, order preserved.
 *
 * Run:  node scripts/crawl/02-galleries.mjs
 */

import { fetchText, toCanonical, decodeJsonUrl, pool, readState, writeState } from './lib.mjs';

const CONCURRENCY = 4;
const CHECKPOINT_EVERY = 50;

const FULL_RE = /"full":"(https:\\?\/\\?\/www\.danhov\.com\\?\/media\\?\/catalog\\?\/product\\?\/cache\\?\/[^"]+?)"/g;
const SKU_RE = /data-product-sku="([^"]+)"/;
const PRICE_RE = /property="product:price:amount"\s+content="([^"]+)"/;
const TITLE_RE = /<title>([^<]+)<\/title>/;
const OGTITLE_RE = /property="og:title"\s+content="([^"]+)"/;
const DESC_RE = /name="description"\s+content="([^"]*)"/;

function clean(s) {
  return (s || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&#39;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&middot;/g, '·')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractImages(html) {
  const seen = new Set();
  const out = [];
  let m;
  while ((m = FULL_RE.exec(html)) !== null) {
    const canonical = toCanonical(decodeJsonUrl(m[1]));
    if (seen.has(canonical)) continue;
    seen.add(canonical);
    out.push(canonical);
  }
  return out;
}

function parseProduct(html) {
  const sku = SKU_RE.exec(html)?.[1] || null;
  let name = clean(OGTITLE_RE.exec(html)?.[1] || TITLE_RE.exec(html)?.[1] || '');
  name = name.replace(/\s*\|\s*DANHOV.*$/i, '').trim();
  const priceRaw = PRICE_RE.exec(html)?.[1] || null;
  const price = priceRaw ? Number(priceRaw) : null;
  const description = clean(DESC_RE.exec(html)?.[1] || '');
  const images = extractImages(html);
  return { sku, name, price, description, images };
}

async function main() {
  const manifest = readState('products.manifest.json', {});
  const entries = Object.values(manifest);
  const galleries = readState('galleries.json', {});

  const todo = entries.filter((e) => !galleries[e.url]);
  console.log(`→ ${entries.length} products total · ${todo.length} to fetch · ${entries.length - todo.length} cached\n`);

  let done = 0;
  let withImages = 0;
  let empty = 0;
  let failed = 0;

  await pool(todo, CONCURRENCY, async (e) => {
    const { ok, html, status } = await fetchText(e.url);
    done++;
    if (!ok || !html) {
      failed++;
      galleries[e.url] = { ...e, error: `fetch ${status}`, images: [] };
    } else {
      const parsed = parseProduct(html);
      galleries[e.url] = { ...e, ...parsed };
      if (parsed.images.length > 0) withImages++;
      else empty++;
    }
    if (done % CHECKPOINT_EVERY === 0) {
      writeState('galleries.json', galleries);
      process.stdout.write(`  …${done}/${todo.length}  (imgs:${withImages} empty:${empty} fail:${failed})\n`);
    }
  });

  writeState('galleries.json', galleries);

  const all = Object.values(galleries);
  const totalImages = all.reduce((n, p) => n + (p.images?.length || 0), 0);
  const noImg = all.filter((p) => !p.images || p.images.length === 0).length;
  console.log(`\n✓ galleries.json written`);
  console.log(`    products:        ${all.length}`);
  console.log(`    total images:    ${totalImages}`);
  console.log(`    products w/o img: ${noImg}`);
  console.log(`    avg images/prod: ${(totalImages / Math.max(1, all.length - noImg)).toFixed(1)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
