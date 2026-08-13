import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

config({ path: '.env.local' });
const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
  realtime: { transport: ws },
});

const { data } = await c.from('products').select('sku, slug, images, metal_images').order('sku');

const urlToSkus = new Map();
for (const p of data) {
  const urls = new Set();
  if (Array.isArray(p.images)) p.images.forEach(u => urls.add(u));
  if (p.metal_images && typeof p.metal_images === 'object') {
    for (const arr of Object.values(p.metal_images)) {
      if (Array.isArray(arr)) arr.forEach(u => urls.add(u));
    }
  }
  for (const u of urls) {
    if (!urlToSkus.has(u)) urlToSkus.set(u, []);
    urlToSkus.get(u).push(p.sku);
  }
}

const allUrls = [...urlToSkus.keys()];
console.log(`Checking ${allUrls.length} unique image URLs (low concurrency, with retry on 429)...`);

async function checkOne(url, attempt = 1) {
  try {
    const res = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-0' }, signal: AbortSignal.timeout(15000) });
    if (res.status === 429 && attempt <= 4) {
      await new Promise(r => setTimeout(r, 1500 * attempt));
      return checkOne(url, attempt + 1);
    }
    if (res.ok || res.status === 206) return null;
    return { url, status: res.status };
  } catch (e) {
    if (attempt <= 2) {
      await new Promise(r => setTimeout(r, 1000));
      return checkOne(url, attempt + 1);
    }
    return { url, status: 'ERR:' + e.message };
  }
}

let checked = 0;
const bad = [];
const CONCURRENCY = 6;
let idx = 0;

async function worker() {
  while (idx < allUrls.length) {
    const i = idx++;
    const url = allUrls[i];
    const result = await checkOne(url);
    if (result) bad.push({ ...result, skus: urlToSkus.get(url) });
    checked++;
    if (checked % 500 === 0) console.log(`  ...${checked}/${allUrls.length}`);
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));

console.log(`\nDone. ${bad.length} confirmed-bad URLs out of ${allUrls.length}.`);
const byStatus = {};
for (const b of bad) byStatus[b.status] = (byStatus[b.status] || 0) + 1;
console.log('By status:', JSON.stringify(byStatus, null, 2));

const skusAffected = new Set();
for (const b of bad) b.skus.forEach(s => skusAffected.add(s));
console.log(`Distinct SKUs affected: ${skusAffected.size}`);

for (const b of bad.slice(0, 80)) {
  console.log(`  [${b.status}] ${b.url}  (skus: ${b.skus.join(',')})`);
}
if (bad.length > 80) console.log(`  ...and ${bad.length - 80} more`);
