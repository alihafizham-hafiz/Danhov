import path from 'node:path';
import { promises as fs } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const SOURCE_ROOT = '/Users/rana/Desktop/danhov-products';
const PUBLIC_ROOT = path.resolve('public/product-images');
const MANIFEST_PATH = path.resolve('data/product-image-manifest.json');
const MAX_WIDTH = 800;
const JPEG_QUALITY = '60';
const MAX_IMAGES_PER_METAL = 3;
const MAX_DEFAULT_IMAGES = 4;
const execFileAsync = promisify(execFile);

const METAL_KEYS = new Map([
  ['platinum', 'platinum'],
  ['14k white gold', '14k_white'],
  ['18k white gold', '18k_white'],
  ['14k yellow gold', '14k_yellow'],
  ['18k yellow gold', '18k_yellow'],
  ['14k rose gold', '14k_rose'],
  ['18k rose gold', '18k_rose'],
]);

function slug(value) {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function metalKeyFromPath(parts) {
  for (const part of parts) {
    const key = METAL_KEYS.get(part.toLowerCase().trim());
    if (key) return key;
  }
  return null;
}

function skuFromFilename(file) {
  const stem = path.basename(file, path.extname(file));
  const beforeAngle = stem.replace(/_\d+$/, '');
  const match = beforeAngle.match(/([A-Z]{1,4}\d[A-Z0-9]*(?:-[A-Z0-9]+)*)\s*$/i)
    ?? beforeAngle.match(/\b([A-Z]{1,4}\d[A-Z0-9]*)\b/i);
  return match?.[1]?.replace(/\s+/g, '').toUpperCase() ?? null;
}

function baseSku(sku) {
  // Source filenames append a metal and, frequently, a center-stone shape
  // (for example VE536P-14Y-RD).  Those are variants of the base style, not
  // part of its product SKU.
  return sku
    .replace(/-(?:PL|(?:14|18)[A-Z]+)(?:-[A-Z0-9]+)*$/i, '')
    .toUpperCase();
}

function sortByAngle(a, b) {
  const ai = Number(path.basename(a.src).match(/_(\d+)\.[^.]+$/)?.[1] ?? 0);
  const bi = Number(path.basename(b.src).match(/_(\d+)\.[^.]+$/)?.[1] ?? 0);
  return ai - bi || a.src.localeCompare(b.src);
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...await walk(full));
    } else if (/\.(jpe?g|png|webp)$/i.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function manifestFromPublishedAssets() {
  const manifest = {};
  if (!await exists(PUBLIC_ROOT)) return manifest;

  for (const file of await walk(PUBLIC_ROOT)) {
    const parts = path.relative('public', file).split(path.sep);
    if (parts.length < 4 || parts[0] !== 'product-images') continue;
    const [, sku, metal] = parts;
    const entry = manifest[sku.toUpperCase()] ?? { images: [], metal_images: {} };
    const url = `/${parts.join('/')}`;
    if (metal === 'default') entry.images.push(url);
    else (entry.metal_images[metal] ??= []).push(url);
    manifest[sku.toUpperCase()] = entry;
  }

  return manifest;
}

async function main() {
  const files = await walk(SOURCE_ROOT);
  const grouped = new Map();
  const publishedManifest = await manifestFromPublishedAssets();

  for (const file of files) {
    const sku = skuFromFilename(file);
    if (!sku) continue;
    const key = baseSku(sku) === 'TRH100' ? 'TRH100Y' : baseSku(sku);
    const relParts = path.relative(SOURCE_ROOT, file).split(path.sep);
    const metal = metalKeyFromPath(relParts);
    const angle = path.basename(file).match(/_(\d+)\.[^.]+$/)?.[1] ?? '1';
    const destRel = [
      'product-images',
      key.toLowerCase(),
      metal ?? 'default',
      `${slug(path.basename(file, path.extname(file)))}-${angle}.jpg`,
    ].join('/');
    const item = { src: file, url: `/${destRel}`, dest: path.join('public', destRel), metal };
    const arr = grouped.get(key) ?? [];
    arr.push(item);
    grouped.set(key, arr);
  }

  await fs.mkdir(PUBLIC_ROOT, { recursive: true });

  const manifest = { ...publishedManifest };
  let converted = 0;
  let skipped = 0;

  for (const [sku, items] of grouped) {
    items.sort(sortByAngle);
    const byMetal = {};
    const defaultImages = [];
    const selectedItems = [];

    const itemGroups = new Map();
    for (const item of items) {
      const groupKey = item.metal ?? 'default';
      const arr = itemGroups.get(groupKey) ?? [];
      arr.push(item);
      itemGroups.set(groupKey, arr);
    }
    for (const [groupKey, groupItems] of itemGroups) {
      selectedItems.push(
        ...groupItems.slice(0, groupKey === 'default' ? MAX_DEFAULT_IMAGES : MAX_IMAGES_PER_METAL),
      );
    }

    for (const item of selectedItems) {
      await fs.mkdir(path.dirname(item.dest), { recursive: true });
      if (await exists(item.dest)) {
        skipped++;
      } else {
        await execFileAsync('sips', [
          '-s',
          'format',
          'jpeg',
          '-s',
          'formatOptions',
          JPEG_QUALITY,
          '-Z',
          String(MAX_WIDTH),
          item.src,
          '--out',
          item.dest,
        ]);
        converted++;
      }

      if (item.metal) {
        byMetal[item.metal] ??= [];
        byMetal[item.metal].push(item.url);
      } else {
        defaultImages.push(item.url);
      }
    }

    const metalImages = Object.fromEntries(
      Object.entries(byMetal).map(([metal, urls]) => [metal, Array.from(new Set(urls)).slice(0, 9)]),
    );
    const images = defaultImages.length
      ? defaultImages
      : Object.values(metalImages)[0] ?? [];

    manifest[sku] = {
      images: Array.from(new Set(images)).slice(0, 9),
      metal_images: metalImages,
    };
  }

  await fs.writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Assets converted: ${converted}`);
  console.log(`Assets skipped:   ${skipped}`);
  console.log(`Manifest SKUs:    ${Object.keys(manifest).length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
