import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'data/product-image-manifest.json');
const minSkuCount = 600;
const legacyDanhovMedia = /^https?:\/\/(?:www\.)?danhov\.com\/media\/catalog\//i;

function fail(message) {
  console.error(`Product image verification failed: ${message}`);
  process.exitCode = 1;
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
  fail(`missing ${path.relative(root, manifestPath)}`);
} else {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const entries = Object.entries(manifest);

  if (entries.length < minSkuCount) {
    fail(`manifest has ${entries.length} SKUs, expected at least ${minSkuCount}`);
  }

  let imageCount = 0;
  let checkedFileCount = 0;

  for (const [sku, entry] of entries) {
    const images = collectImages(entry);
    if (images.length === 0) {
      fail(`${sku} has no images in the manifest`);
      continue;
    }

    for (const url of images) {
      imageCount += 1;

      if (typeof url !== 'string' || url.length === 0) {
        fail(`${sku} has an invalid image URL`);
        continue;
      }

      if (legacyDanhovMedia.test(url)) {
        fail(`${sku} still points at legacy media/catalog URL: ${url}`);
        continue;
      }

      if (/^https?:\/\//i.test(url)) {
        fail(`${sku} points at an external image URL in the local manifest: ${url}`);
        continue;
      }

      if (!url.startsWith('/product-images/')) {
        fail(`${sku} image is outside /product-images: ${url}`);
        continue;
      }

      const filePath = path.join(root, 'public', url);
      checkedFileCount += 1;
      if (!existsSync(filePath)) {
        fail(`${sku} references missing file: ${url}`);
      }
    }
  }

  if (process.exitCode) {
    process.exit();
  }

  console.log(`Product image verification passed: ${entries.length} SKUs, ${imageCount} images, ${checkedFileCount} local files checked.`);
}
