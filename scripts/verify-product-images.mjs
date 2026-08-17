import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'data/product-image-manifest.json');
const minSkuCount = 400;
const legacyDanhovMedia = /^https?:\/\/(?:www\.)?danhov\.com\/media\/catalog\//i;

// Images live in Cloudflare R2 — this is the one allowed remote origin.
// Anything else (or a bare /product-images/ local path) is flagged, but see
// the note below on why that no longer fails the build.
const r2Origin = /^https:\/\/pub-2d92bc9fc39242bf95b565216d0b999e\.r2\.dev\//i;

// This check is advisory, not a build gate. It used to hard-fail the build
// (process.exitCode = 1) whenever a locally-referenced /product-images/ file
// wasn't present on disk — but that folder only ever exists on one laptop
// (see .gitignore), so any build from any other machine (CI, a teammate's
// clone, a fresh Vercel build without a warm cache) failed outright, even
// though the site works fine at runtime via the R2/DB fallback chain in
// lib/local-product-images.ts. Warn loudly, never block.
let hadIssues = false;
function warn(message) {
  console.warn(`[verify-product-images] ${message}`);
  hadIssues = true;
}

function collectImages(entry) {
  const urls = [];
  if (Array.isArray(entry?.images)) urls.push(...entry.images);
  for (const metalUrls of Object.values(entry?.metal_images ?? {})) {
    if (Array.isArray(metalUrls)) urls.push(...metalUrls);
  }
  return urls;
}

if (!existsSync(manifestPath)) {
  warn(`missing ${path.relative(root, manifestPath)} — product images will rely entirely on the database fallback.`);
} else {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const entries = Object.entries(manifest);

  if (entries.length < minSkuCount) {
    warn(`manifest has ${entries.length} SKUs, expected at least ${minSkuCount}.`);
  }

  let imageCount = 0;
  let r2Count = 0;
  let localCount = 0;
  let localMissingCount = 0;

  for (const [sku, entry] of entries) {
    const images = collectImages(entry);
    if (images.length === 0) {
      warn(`${sku} has no images in the manifest.`);
      continue;
    }

    for (const url of images) {
      imageCount += 1;

      if (typeof url !== 'string' || url.length === 0) {
        warn(`${sku} has an invalid image URL.`);
        continue;
      }

      if (legacyDanhovMedia.test(url)) {
        warn(`${sku} still points at the legacy media/catalog URL: ${url}`);
        continue;
      }

      if (r2Origin.test(url)) {
        r2Count += 1;
        continue;
      }

      if (/^https?:\/\//i.test(url)) {
        warn(`${sku} points at an unrecognized external image host: ${url}`);
        continue;
      }

      if (url.startsWith('/product-images/')) {
        localCount += 1;
        if (!existsSync(path.join(root, 'public', url))) {
          localMissingCount += 1;
        }
        continue;
      }

      warn(`${sku} image is neither an R2 URL nor a /product-images/ path: ${url}`);
    }
  }

  console.log(
    `Product image manifest: ${entries.length} SKUs, ${imageCount} images ` +
    `(${r2Count} from R2, ${localCount} local — ${localMissingCount} of those not present on this machine, which is fine).`,
  );
  if (hadIssues) {
    console.warn('[verify-product-images] Issues noted above are informational only and do not fail the build.');
  }
}
