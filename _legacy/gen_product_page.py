#!/usr/bin/env python3
"""
Extract all product data from the 4 listing pages and generate product.html
Also patches listing pages to navigate to product.html on card click.
"""
import json, re
from bs4 import BeautifulSoup

# ──────────────────────────────────────────────────────────────────────────────
# 1.  EXTRACT PRODUCT DATA
# ──────────────────────────────────────────────────────────────────────────────

SOURCE_FILES = {
    'engagement-rings.html': {
        'category': 'Engagement Rings',
        'category_link': 'engagement-rings.html',
        'col_attr': 'data-col',
        'col_param': 'col',
        'collection_names': {
            'abbraccio': 'Abbraccio',
            'voltaggio': 'Voltaggio',
            'classico': 'Classico',
            'norme': 'Norme de DANHOV',
            'carezza': 'Carezza',
            'per-lei': 'Per Lei',
            'petalo': 'Petalo',
            'solo': 'Solo Filo',
            'eleganza': 'Eleganza',
            'couture': 'Couture',
            'unito': 'Unito',
        }
    },
    'wedding-bands.html': {
        'category': 'Wedding Bands',
        'category_link': 'wedding-bands.html',
        'col_attr': 'data-sub',
        'col_param': 'sub',
        'collection_names': {
            'award-winners': 'Award Winners',
            'her-bands': 'Her Bands',
            'his-bands': 'His Bands',
        }
    },
    'fine-jewelry.html': {
        'category': 'Fine Jewelry',
        'category_link': 'fine-jewelry.html',
        'col_attr': 'data-sub',
        'col_param': 'sub',
        'collection_names': {
            'earrings': 'Earrings',
            'pendants': 'Pendants',
            'rings': 'Rings',
            'bands': 'Bands',
            'limited': 'Limited Edition',
        }
    },
    'mens.html': {
        'category': "Men's Jewelry",
        'category_link': 'mens.html',
        'col_attr': 'data-sub',
        'col_param': 'sub',
        'collection_names': {
            'rings': 'Rings',
            'bracelets': 'Bracelets',
            'necklaces': 'Necklaces & Pendants',
        }
    },
}

BASE_DIR = '/Users/rana/danhov-website'
products = {}  # style -> product dict

for fname, meta in SOURCE_FILES.items():
    with open(f'{BASE_DIR}/{fname}', encoding='utf-8') as f:
        soup = BeautifulSoup(f.read(), 'html.parser')

    seen_styles = set()
    for card in soup.find_all('div', class_='prod-card'):
        style_el = card.find(class_='prod-style')
        if not style_el:
            continue
        style = style_el.get_text(strip=True)
        if style in seen_styles:
            continue
        seen_styles.add(style)
        if style in products:
            continue  # already captured from another page (e.g. shared bands)

        name_el   = card.find(class_='prod-name')
        metals_el = card.find(class_='prod-metals')
        price_el  = card.find(class_='prod-price')
        desc_el   = card.find(class_='prod-desc')
        img_el    = card.find('img', class_='prod-real-img')
        badge_el  = card.find(class_=['prod-collection-badge', 'prod-category-badge'])

        col_val = card.get(meta['col_attr'], '')
        # For multi-value data-sub (space-separated), take the first value
        col_key = col_val.split()[0] if col_val else ''
        col_name = meta['collection_names'].get(col_key, col_key.replace('-', ' ').title())

        # Build collection link
        col_link = meta['category_link']
        if col_key and col_key != 'all':
            col_link = meta['category_link'] + '?' + meta['col_param'] + '=' + col_key

        products[style] = {
            'name':         name_el.get_text(strip=True) if name_el else '',
            'collection':   col_name,
            'collectionKey': col_key,
            'collectionLink': col_link,
            'category':     meta['category'],
            'categoryLink': meta['category_link'],
            'metals':       metals_el.get_text(strip=True) if metals_el else '',
            'price':        price_el.get_text(strip=True) if price_el else '',
            'desc':         desc_el.get_text(strip=True) if desc_el else '',
            'image':        img_el['src'] if img_el and img_el.get('src') else '',
        }

# ──────────────────────────────────────────────────────────────────────────────
# 2.  GENERATE product.html
# ──────────────────────────────────────────────────────────────────────────────

products_js = 'const PRODUCTS = ' + json.dumps(products, ensure_ascii=False, indent=2) + ';'

HTML = '''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Product &mdash; DANHOV Oneness</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400;1,600&family=Playfair+Display:ital,wght@0,700;0,800;1,700;1,800&family=Cinzel:wght@400;600&family=Jost:wght@300;400&family=Montserrat:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  :root {
    --black: #fff8f6;
    --deep: #fdf0ed;
    --gold: #9b6b4a;
    --gold-light: #c4916e;
    --gold-dim: #c9a898;
    --crimson: #b5606a;
    --logo-red: #AC3438;
    --logo-red-dark: #8B2A2D;
    --blush: #e8b4bc;
    --cream: #3d2520;
    --grey: #7a5c58;
    --white: #fff8f6;
  }

  html { scroll-behavior: smooth; }
  body {
    background: var(--black);
    color: var(--cream);
    font-family: \'Jost\', sans-serif;
    overflow-x: hidden;
    cursor: none;
  }

  /* CURSOR */
  .cursor { width:8px;height:8px;background:var(--logo-red);border-radius:50%;position:fixed;pointer-events:none;z-index:9999;transition:transform 0.15s ease; }
  .cursor-ring { width:36px;height:36px;border:1px solid var(--logo-red);border-radius:50%;position:fixed;pointer-events:none;z-index:9998;transition:all 0.3s ease;opacity:0.5; }

  /* NAV */
  nav { position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:24px 48px;background:#fff8f6;border-bottom:1px solid rgba(172,52,56,0.08);box-shadow:0 2px 12px rgba(172,52,56,0.04); }
  .nav-logo { text-decoration:none;display:flex;align-items:center; }
  .nav-logo img { height:32px;width:auto;display:block; }
  .nav-links { display:flex;gap:36px;list-style:none; }
  .nav-links a { font-family:\'Montserrat\',sans-serif;font-size:13px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:var(--cream);text-decoration:none;transition:color 0.3s; }
  .nav-links a:hover { color:var(--logo-red); }
  .nav-links a.active { color:var(--logo-red); }
  .nav-cta { font-family:\'Montserrat\',sans-serif;font-size:13px;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;color:#fff8f6;background:var(--logo-red);padding:12px 28px;text-decoration:none;transition:background 0.3s;display:flex;align-items:center;gap:8px; }
  .nav-cta:hover { background:var(--logo-red-dark); }

  /* MEGA MENU */
  .nav-links > li { position:static; }
  .mega-menu { position:fixed;top:81px;left:0;right:0;background:#fff8f6;border-top:2px solid var(--logo-red);box-shadow:0 20px 60px rgba(61,37,32,0.14);padding:44px 80px 52px;z-index:99;opacity:0;visibility:hidden;transform:translateY(-6px);transition:opacity 0.22s ease,visibility 0.22s,transform 0.22s ease;display:flex;gap:0; }
  .nav-links > li:hover > .mega-menu { opacity:1;visibility:visible;transform:translateY(0); }
  .mega-overlay { position:fixed;top:81px;left:0;right:0;bottom:0;background:rgba(61,37,32,0.22);z-index:98;opacity:0;visibility:hidden;transition:opacity 0.22s ease,visibility 0.22s;pointer-events:none; }
  nav:has(li:hover > .mega-menu) + .mega-overlay { opacity:1;visibility:visible; }
  .mm-col { flex:1;padding:0 32px;border-right:1px solid rgba(172,52,56,0.08); }
  .mm-col:first-child { padding-left:0; }
  .mm-col:last-child { border-right:none;padding-right:0; }
  .mm-col-wide { flex:2; }
  .mm-label { font-family:\'Montserrat\',sans-serif;font-size:10px;font-weight:700;letter-spacing:0.35em;text-transform:uppercase;color:var(--logo-red);margin-bottom:22px;display:block; }
  .mm-grid { display:grid;gap:12px; }
  .mm-grid-2 { grid-template-columns:repeat(2,1fr); }
  .mm-grid-3 { grid-template-columns:repeat(3,1fr); }
  .mm-grid-5 { grid-template-columns:repeat(5,1fr); }
  .mm-card { text-decoration:none;display:flex;flex-direction:column;gap:8px; }
  .mm-card-img { background:#f0e4e0;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center; }
  .mm-card-img img { width:100%;height:100%;object-fit:cover;display:block;transition:transform 0.35s ease; }
  .mm-card:hover .mm-card-img img { transform:scale(1.06); }
  .mm-card-img-lg { height:140px; }
  .mm-card-img-sm { height:96px; }
  .mm-card-name { font-family:\'Montserrat\',sans-serif;font-size:11px;font-weight:500;letter-spacing:0.08em;color:var(--cream);transition:color 0.2s;text-transform:uppercase; }
  .mm-card:hover .mm-card-name { color:var(--logo-red); }
  .mm-metals { display:flex;gap:10px;flex-wrap:wrap;margin-top:4px; }
  .mm-metal { display:flex;align-items:center;gap:7px;font-family:\'Montserrat\',sans-serif;font-size:11px;font-weight:500;letter-spacing:0.06em;color:var(--cream);text-decoration:none;padding:7px 14px;border:1px solid rgba(172,52,56,0.2);transition:border-color 0.2s,color 0.2s; }
  .mm-metal:hover { border-color:var(--logo-red);color:var(--logo-red); }
  .mm-metal-swatch { width:14px;height:14px;border-radius:50%; }
  .mm-explore { display:inline-block;margin-top:28px;font-family:\'Montserrat\',sans-serif;font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:var(--logo-red);text-decoration:none;border-bottom:1px solid var(--logo-red);padding-bottom:2px;transition:opacity 0.2s; }
  .mm-explore:hover { opacity:0.7; }

  /* BREADCRUMB / BACK */
  .product-breadcrumb {
    margin-top: 81px;
    padding: 20px 64px;
    display: flex;
    align-items: center;
    gap: 10px;
    font-family: \'Montserrat\', sans-serif;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--grey);
    border-bottom: 1px solid rgba(172,52,56,0.06);
    background: #fff8f6;
  }
  .product-breadcrumb a { color: var(--grey); text-decoration: none; transition: color 0.2s; }
  .product-breadcrumb a:hover { color: var(--logo-red); }
  .bc-sep { opacity: 0.4; }

  /* PRODUCT LAYOUT */
  .product-detail {
    min-height: calc(100vh - 81px);
    display: grid;
    grid-template-columns: 58% 42%;
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 0 80px;
  }

  /* IMAGE COLUMN */
  .product-image-col {
    padding: 40px 40px 40px 64px;
    position: sticky;
    top: 81px;
    height: calc(100vh - 81px);
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .product-img-frame {
    flex: 1;
    background: linear-gradient(135deg, #f7e4e4 0%, #f0d4d4 50%, #e8cece 100%);
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .product-img-frame img.product-main-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.5s ease;
  }
  .product-img-frame:hover img.product-main-img { transform: scale(1.04); }
  .product-img-placeholder {
    width: 100%; height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .product-img-placeholder svg { width: 80px; height: 80px; opacity: 0.18; }
  .product-img-badge {
    position: absolute;
    top: 18px; left: 18px;
    font-family: \'Cinzel\', serif;
    font-size: 9px; font-weight: 600;
    letter-spacing: 0.14em; text-transform: uppercase;
    background: var(--logo-red); color: #fff8f6;
    padding: 5px 11px;
  }

  /* INFO COLUMN */
  .product-info-col {
    padding: 40px 64px 40px 40px;
    display: flex;
    flex-direction: column;
    gap: 0;
    border-left: 1px solid rgba(172,52,56,0.07);
  }
  .product-category-label {
    font-family: \'Montserrat\', sans-serif;
    font-size: 10px; font-weight: 700;
    letter-spacing: 0.3em; text-transform: uppercase;
    color: var(--logo-red);
    margin-bottom: 14px;
    display: block;
  }
  .product-name {
    font-family: \'Cormorant Garamond\', serif;
    font-size: 36px; font-weight: 600;
    line-height: 1.2;
    color: var(--cream);
    margin-bottom: 10px;
  }
  .product-style-num {
    font-family: \'Montserrat\', sans-serif;
    font-size: 10px; font-weight: 500;
    letter-spacing: 0.22em; text-transform: uppercase;
    color: var(--gold-dim);
    margin-bottom: 28px;
    display: block;
  }
  .product-divider {
    width: 36px; height: 1px;
    background: var(--logo-red);
    margin-bottom: 28px;
    opacity: 0.5;
  }
  .product-price {
    font-family: \'Cormorant Garamond\', serif;
    font-size: 28px; font-weight: 400; font-style: italic;
    color: var(--gold);
    margin-bottom: 6px;
  }
  .product-metals {
    font-family: \'Montserrat\', sans-serif;
    font-size: 11px; font-weight: 500;
    letter-spacing: 0.1em;
    color: var(--grey);
    margin-bottom: 32px;
  }
  .product-desc {
    font-family: \'Jost\', sans-serif;
    font-size: 15px;
    line-height: 1.8;
    color: var(--cream);
    margin-bottom: 40px;
    max-width: 480px;
  }
  .product-inquire-btn {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: var(--logo-red);
    color: #fff8f6;
    font-family: \'Montserrat\', sans-serif;
    font-size: 12px; font-weight: 600;
    letter-spacing: 0.2em; text-transform: uppercase;
    text-decoration: none;
    padding: 18px 36px;
    transition: background 0.3s;
    align-self: flex-start;
    margin-bottom: 18px;
  }
  .product-inquire-btn:hover { background: var(--logo-red-dark); }
  .product-handcraft-note {
    font-family: \'Jost\', sans-serif;
    font-size: 12px;
    color: var(--grey);
    line-height: 1.7;
    margin-bottom: 40px;
  }
  .product-attributes {
    border-top: 1px solid rgba(172,52,56,0.08);
    padding-top: 32px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .product-attr-row {
    display: flex;
    gap: 16px;
    align-items: flex-start;
  }
  .product-attr-icon {
    width: 20px; height: 20px;
    flex-shrink: 0;
    opacity: 0.5;
    margin-top: 1px;
  }
  .product-attr-text {
    font-family: \'Jost\', sans-serif;
    font-size: 13px;
    color: var(--grey);
    line-height: 1.6;
  }
  .product-attr-text strong {
    font-weight: 600;
    color: var(--cream);
    display: block;
    font-size: 12px;
    letter-spacing: 0.04em;
  }

  /* NOT FOUND */
  .product-not-found {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
    padding: 80px 48px;
    text-align: center;
  }
  .product-not-found h2 { font-family: \'Cormorant Garamond\', serif; font-size: 32px; }
  .product-not-found a { color: var(--logo-red); text-decoration: none; font-family: \'Montserrat\', sans-serif; font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase; border-bottom: 1px solid var(--logo-red); padding-bottom: 2px; }

  /* FOOTER */
  footer { background: var(--cream); color: rgba(255,248,246,0.7); padding: 64px 80px 32px; }
  .footer-top { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 60px; margin-bottom: 48px; }
  .footer-brand-name { text-decoration: none; display: block; margin-bottom: 16px; }
  .footer-logo-img { height: 28px; width: auto; filter: brightness(0) invert(1); opacity: 0.9; }
  .footer-tagline { font-size: 13px; line-height: 1.7; color: rgba(255,248,246,0.55); margin-bottom: 24px; max-width: 280px; }
  .footer-contact p { font-size: 12px; letter-spacing: 0.04em; margin-bottom: 6px; }
  .footer-contact a { color: rgba(255,248,246,0.7); text-decoration: none; transition: color 0.2s; }
  .footer-contact a:hover { color: var(--blush); }
  .footer-col-title { font-family: \'Montserrat\', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.3em; text-transform: uppercase; color: rgba(255,248,246,0.9); margin-bottom: 20px; }
  .footer-links { list-style: none; display: flex; flex-direction: column; gap: 12px; }
  .footer-links a { font-size: 13px; color: rgba(255,248,246,0.55); text-decoration: none; transition: color 0.2s; }
  .footer-links a:hover { color: var(--blush); }
  .footer-bottom { border-top: 1px solid rgba(255,248,246,0.08); padding-top: 28px; display: flex; justify-content: space-between; align-items: center; }
  .footer-copy, .footer-made { font-size: 11px; color: rgba(255,248,246,0.35); letter-spacing: 0.06em; }

  @media (max-width: 900px) {
    .product-detail { grid-template-columns: 1fr; }
    .product-image-col { position: static; height: auto; min-height: 50vw; padding: 24px 24px 0; }
    .product-info-col { padding: 24px; border-left: none; border-top: 1px solid rgba(172,52,56,0.07); }
    .product-name { font-size: 28px; }
    .product-breadcrumb { padding: 16px 24px; }
    nav { padding: 16px 24px; }
    footer { padding: 48px 24px 24px; }
    .footer-top { grid-template-columns: 1fr 1fr; gap: 32px; }
  }
</style>
</head>
<body>

<div class="cursor" id="cursor"></div>
<div class="cursor-ring" id="cursorRing"></div>

<nav>
  <a href="index.html" class="nav-logo"><img src="danhov-logo-transparent.png" alt="DANHOV"></a>
  <ul class="nav-links">
    <li>
      <a href="engagement-rings.html">Engagement Rings</a>
      <div class="mega-menu">
        <div class="mm-col mm-col-wide">
          <span class="mm-label">Collections</span>
          <div class="mm-grid mm-grid-5">
            <a href="engagement-rings.html?col=abbraccio" class="mm-card"><div class="mm-card-img mm-card-img-sm"><img src="https://www.danhov.com/media/catalog/product/cache/2b1edc83ec865263004db07a00170440/a/e/ae520uq_r1_1_wg.jpg" alt="Abbraccio"></div><span class="mm-card-name">Abbraccio</span></a>
            <a href="engagement-rings.html?col=carezza" class="mm-card"><div class="mm-card-img mm-card-img-sm"><img src="https://www.danhov.com/media/wysiwyg/new-home/img_collection_carezza.jpg" alt="Carezza"></div><span class="mm-card-name">Carezza</span></a>
            <a href="engagement-rings.html?col=classico" class="mm-card"><div class="mm-card-img mm-card-img-sm"><img src="https://www.danhov.com/media/wysiwyg/new-home/img_collection_classico.jpg" alt="Classico"></div><span class="mm-card-name">Classico</span></a>
            <a href="engagement-rings.html?col=couture" class="mm-card"><div class="mm-card-img mm-card-img-sm"><img src="https://www.danhov.com/media/wysiwyg/new-home/img_collection_couture.jpg" alt="Couture"></div><span class="mm-card-name">Couture</span></a>
            <a href="engagement-rings.html?col=eleganza" class="mm-card"><div class="mm-card-img mm-card-img-sm"><img src="https://www.danhov.com/media/catalog/product/cache/2b1edc83ec865263004db07a00170440/a/e/ae141-4_48oy8iu3ljtkgsxf.jpg" alt="Eleganza"></div><span class="mm-card-name">Eleganza</span></a>
            <a href="engagement-rings.html?col=per-lei" class="mm-card"><div class="mm-card-img mm-card-img-sm"><img src="https://www.danhov.com/media/wysiwyg/new-home/img_collection_per-lei.jpg" alt="Per Lei"></div><span class="mm-card-name">Per Lei</span></a>
            <a href="engagement-rings.html?col=petalo" class="mm-card"><div class="mm-card-img mm-card-img-sm"><img src="https://www.danhov.com/media/wysiwyg/new-home/img_collection_petalo.jpg" alt="Petalo"></div><span class="mm-card-name">Petalo</span></a>
            <a href="engagement-rings.html?col=solo-filo" class="mm-card"><div class="mm-card-img mm-card-img-sm"><img src="https://www.danhov.com/media/wysiwyg/new-home/img_collection_solo-filo.jpg" alt="Solo Filo"></div><span class="mm-card-name">Solo Filo</span></a>
            <a href="engagement-rings.html?col=unito" class="mm-card"><div class="mm-card-img mm-card-img-sm"><img src="https://www.danhov.com/media/wysiwyg/new-home/img_collection_unito.jpg" alt="Unito"></div><span class="mm-card-name">Unito</span></a>
            <a href="engagement-rings.html?col=voltaggio" class="mm-card"><div class="mm-card-img mm-card-img-sm"><img src="https://www.danhov.com/media/catalog/product/cache/2b1edc83ec865263004db07a00170440/w/e/we520p_r1_wg_1__2.jpg" alt="Voltaggio"></div><span class="mm-card-name">Voltaggio</span></a>
          </div>
          <a href="engagement-rings.html" class="mm-explore">Explore All Engagement Rings &rarr;</a>
        </div>
        <div class="mm-col" style="flex:0 0 220px;">
          <span class="mm-label">Shop by Metal</span>
          <div class="mm-metals" style="flex-direction:column;">
            <a href="engagement-rings.html?metal=white-gold" class="mm-metal"><span class="mm-metal-swatch" style="background:#e8e0d8;border:1px solid #ccc;"></span>White Gold</a>
            <a href="engagement-rings.html?metal=yellow-gold" class="mm-metal"><span class="mm-metal-swatch" style="background:#d4a853;"></span>Yellow Gold</a>
            <a href="engagement-rings.html?metal=rose-gold" class="mm-metal"><span class="mm-metal-swatch" style="background:#e8a090;"></span>Rose Gold</a>
          </div>
        </div>
      </div>
    </li>
    <li>
      <a href="wedding-bands.html">Wedding Bands</a>
      <div class="mega-menu">
        <div class="mm-col" style="padding-left:0;border-right:none;width:100%;">
          <span class="mm-label">Shop by Category</span>
          <div class="mm-grid mm-grid-3" style="max-width:700px;">
            <a href="wedding-bands.html?sub=award-winners" class="mm-card"><div class="mm-card-img mm-card-img-lg"><img src="https://www.danhov.com/media/wysiwyg/new-home/img_award-winners-1.jpg" alt="Award Winners"></div><span class="mm-card-name">Award Winners</span></a>
            <a href="wedding-bands.html?sub=her-bands" class="mm-card"><div class="mm-card-img mm-card-img-lg"><img src="https://www.danhov.com/media/catalog/product/cache/637ba258c3859c45128cee99e1ea5a62/w/h/white_top_2.jpg" alt="Her Bands"></div><span class="mm-card-name">Her Bands</span></a>
            <a href="wedding-bands.html?sub=his-bands" class="mm-card"><div class="mm-card-img mm-card-img-lg"><img src="https://www.danhov.com/media/wysiwyg/new-home/img_his-bands-1.jpg" alt="His Bands"></div><span class="mm-card-name">His Bands</span></a>
          </div>
          <a href="wedding-bands.html" class="mm-explore">View All Wedding Bands &rarr;</a>
        </div>
      </div>
    </li>
    <li>
      <a href="fine-jewelry.html">Fine Jewelry</a>
      <div class="mega-menu">
        <div class="mm-col" style="padding-left:0;border-right:none;width:100%;">
          <span class="mm-label">Shop by Category</span>
          <div class="mm-grid mm-grid-3" style="max-width:700px;">
            <a href="fine-jewelry.html?sub=bands" class="mm-card"><div class="mm-card-img mm-card-img-lg"><img src="https://www.danhov.com/media/catalog/product/cache/637ba258c3859c45128cee99e1ea5a62/y/e/yellow_top_4.jpg" alt="Bands"></div><span class="mm-card-name">Bands</span></a>
            <a href="fine-jewelry.html?sub=earrings" class="mm-card"><div class="mm-card-img mm-card-img-lg"><img src="https://www.danhov.com/media/catalog/product/cache/637ba258c3859c45128cee99e1ea5a62/1/_/1_rg_15.jpg" alt="Earrings"></div><span class="mm-card-name">Earrings</span></a>
            <a href="fine-jewelry.html?sub=pendants" class="mm-card"><div class="mm-card-img mm-card-img-lg"><img src="https://www.danhov.com/media/catalog/product/cache/637ba258c3859c45128cee99e1ea5a62/l/e/le_517_125_sz_6_1.jpg" alt="Pendants"></div><span class="mm-card-name">Pendants</span></a>
            <a href="fine-jewelry.html?sub=rings" class="mm-card"><div class="mm-card-img mm-card-img-lg"><img src="https://www.danhov.com/media/catalog/product/cache/637ba258c3859c45128cee99e1ea5a62/r/i/ring-c_round_dai_wg_1.jpg" alt="Rings"></div><span class="mm-card-name">Rings</span></a>
          </div>
          <a href="fine-jewelry.html" class="mm-explore">Explore All Fine Jewelry &rarr;</a>
        </div>
      </div>
    </li>
    <li>
      <a href="mens.html">Men\'s</a>
      <div class="mega-menu">
        <div class="mm-col" style="padding-left:0;border-right:none;width:100%;">
          <span class="mm-label">Shop Men\'s</span>
          <div class="mm-grid mm-grid-3" style="max-width:700px;">
            <a href="mens.html?sub=rings" class="mm-card"><div class="mm-card-img mm-card-img-lg"><img src="https://www.danhov.com/media/catalog/product/cache/637ba258c3859c45128cee99e1ea5a62/1/_/1_9_5_1.jpg" alt="Rings"></div><span class="mm-card-name">Rings</span></a>
            <a href="mens.html?sub=bracelets" class="mm-card"><div class="mm-card-img mm-card-img-lg"><img src="https://www.danhov.com/media/catalog/product/cache/637ba258c3859c45128cee99e1ea5a62/c/s/cs147_br_1_yg.jpg" alt="Bracelets"></div><span class="mm-card-name">Bracelets</span></a>
            <a href="mens.html?sub=necklaces" class="mm-card"><div class="mm-card-img mm-card-img-lg"><img src="https://www.danhov.com/media/catalog/product/cache/637ba258c3859c45128cee99e1ea5a62/l/e/le_517_125_sz_6_1.jpg" alt="Necklaces &amp; Pendants"></div><span class="mm-card-name">Necklaces &amp; Pendants</span></a>
          </div>
          <a href="mens.html" class="mm-explore">Explore All Men\'s &rarr;</a>
        </div>
      </div>
    </li>
    <li><a href="engagement-rings.html">Ring Builder</a></li>
  </ul>
  <a href="engagement-rings.html" class="nav-cta">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;"><path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z" fill="currentColor"/><path d="M19 16L19.75 18.25L22 19L19.75 19.75L19 22L18.25 19.75L16 19L18.25 18.25L19 16Z" fill="currentColor" opacity="0.7"/></svg>Build Your Ring
  </a>
</nav>
<div class="mega-overlay"></div>

<!-- BREADCRUMB -->
<div class="product-breadcrumb">
  <a href="index.html">Home</a>
  <span class="bc-sep">/</span>
  <a href="#" id="bcCategory">Collection</a>
  <span class="bc-sep">/</span>
  <span id="bcName">Product</span>
</div>

<!-- PRODUCT DETAIL -->
<div class="product-detail" id="productDetail">

  <!-- IMAGE -->
  <div class="product-image-col">
    <div class="product-img-frame" id="imgFrame">
      <img id="productImg" src="" alt="" class="product-main-img" style="display:none;">
      <div class="product-img-placeholder" id="imgPlaceholder">
        <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="40" cy="40" r="28" stroke="#AC3438" stroke-width="1.5"/>
          <circle cx="40" cy="40" r="18" stroke="#9b6b4a" stroke-width="1"/>
          <circle cx="40" cy="40" r="8" stroke="#AC3438" stroke-width="0.8"/>
          <ellipse cx="40" cy="40" rx="36" ry="14" stroke="#9b6b4a" stroke-width="0.6" opacity="0.5"/>
        </svg>
      </div>
      <span class="product-img-badge" id="collectionBadge"></span>
    </div>
  </div>

  <!-- INFO -->
  <div class="product-info-col">
    <span class="product-category-label" id="collectionLabel"></span>
    <h1 class="product-name" id="productName">Loading&hellip;</h1>
    <span class="product-style-num" id="styleNum"></span>
    <div class="product-divider"></div>
    <p class="product-price" id="productPrice"></p>
    <p class="product-metals" id="productMetals"></p>
    <p class="product-desc" id="productDesc"></p>
    <a href="#" class="product-inquire-btn" id="inquireBtn">
      Inquire About This Piece &rarr;
    </a>
    <p class="product-handcraft-note">Each DANHOV piece is handcrafted to order in Los Angeles. Contact us to begin your journey or ask about custom sizing.</p>
    <div class="product-attributes">
      <div class="product-attr-row">
        <svg class="product-attr-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L14 8H20L15.5 11.5L17.5 17.5L12 14L6.5 17.5L8.5 11.5L4 8H10L12 2Z" stroke="#AC3438" stroke-width="1.2" stroke-linejoin="round"/></svg>
        <div class="product-attr-text"><strong>Handcrafted in Los Angeles</strong>Each ring is individually cast, set, and finished by master jewelers since 1984.</div>
      </div>
      <div class="product-attr-row">
        <svg class="product-attr-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="#AC3438" stroke-width="1.2"/><path d="M12 6v6l4 2" stroke="#AC3438" stroke-width="1.2" stroke-linecap="round"/></svg>
        <div class="product-attr-text"><strong>Custom Sizing Available</strong>All styles can be crafted in your exact size, metal preference, and stone selection.</div>
      </div>
      <div class="product-attr-row">
        <svg class="product-attr-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="#AC3438" stroke-width="1.2"/></svg>
        <div class="product-attr-text"><strong>Lifetime Craftsmanship Warranty</strong>DANHOV stands behind every piece with our commitment to enduring quality.</div>
      </div>
    </div>
  </div>

</div>

<footer>
  <div class="footer-top">
    <div>
      <a href="index.html" class="footer-brand-name"><img src="danhov-logo-transparent.png" alt="DANHOV" class="footer-logo-img"></a>
      <p class="footer-tagline">"Waves are the ocean." Sacred geometry. Eternal love. Handcrafted in Los Angeles since 1984.</p>
      <div class="footer-contact">
        <p>Founded by Jack Hovsepian &middot; Est. 1984</p>
        <p>Los Angeles, California</p>
        <p><a href="mailto:care@danhov.com">care@danhov.com</a></p>
        <p><a href="tel:18883264687">1 (888) DANHOV-7</a></p>
      </div>
    </div>
    <div>
      <p class="footer-col-title">Shop</p>
      <ul class="footer-links">
        <li><a href="engagement-rings.html">Engagement Rings</a></li>
        <li><a href="wedding-bands.html">Wedding Bands</a></li>
        <li><a href="fine-jewelry.html">Fine Jewelry</a></li>
        <li><a href="mens.html">Men\'s Jewelry</a></li>
      </ul>
    </div>
    <div>
      <p class="footer-col-title">Learn</p>
      <ul class="footer-links">
        <li><a href="#">Diamond Guide</a></li>
        <li><a href="#">Ring Size Guide</a></li>
        <li><a href="#">Our Story</a></li>
        <li><a href="#">The Philosophy</a></li>
      </ul>
    </div>
    <div>
      <p class="footer-col-title">Connect</p>
      <ul class="footer-links">
        <li><a href="#">Book Appointment</a></li>
        <li><a href="#">Store Locations</a></li>
        <li><a href="#">Instagram</a></li>
        <li><a href="#">Pinterest</a></li>
      </ul>
    </div>
  </div>
  <div class="footer-bottom">
    <p class="footer-copy">&copy; 2025 DANHOV. All rights reserved.</p>
    <p class="footer-made">Made with love in Los Angeles.</p>
  </div>
</footer>

<script>
  // ─── PRODUCT DATA ──────────────────────────────────────────────────────────
  PRODUCTS_PLACEHOLDER

  // ─── RENDER ────────────────────────────────────────────────────────────────
  (function render() {
    const params = new URLSearchParams(window.location.search);
    const style  = params.get('style') || '';
    const p      = PRODUCTS[style];

    if (!p) {
      document.getElementById('productDetail').innerHTML =
        \'<div class="product-not-found"><h2>Product not found</h2>\' +
        \'<a href="engagement-rings.html">&larr; Back to Engagement Rings</a></div>\';
      return;
    }

    document.title = p.name + \' \\u2014 DANHOV Oneness\';

    document.getElementById(\'collectionLabel\').textContent = p.collection;
    document.getElementById(\'collectionBadge\').textContent = p.collection;
    document.getElementById(\'productName\').textContent    = p.name;
    document.getElementById(\'styleNum\').textContent       = style;
    document.getElementById(\'productPrice\').textContent   = p.price;
    document.getElementById(\'productMetals\').textContent  = p.metals;
    document.getElementById(\'productDesc\').textContent    = p.desc;
    document.getElementById(\'bcCategory\').textContent     = p.category;
    document.getElementById(\'bcCategory\').href            = p.categoryLink;
    document.getElementById(\'bcName\').textContent         = p.name;
    document.getElementById(\'inquireBtn\').href =
      \'mailto:care@danhov.com?subject=Inquiry: \' + style + \' \\u2014 \' + p.name;

    if (p.image) {
      const img = document.getElementById(\'productImg\');
      const ph  = document.getElementById(\'imgPlaceholder\');
      img.alt = p.name;
      img.src = p.image;
      img.style.display = \'block\';
      img.addEventListener(\'error\', function() {
        this.style.display = \'none\';
        ph.style.display = \'flex\';
      });
      img.addEventListener(\'load\', function() { ph.style.display = \'none\'; });
    }
  })();

  // ─── CUSTOM CURSOR ─────────────────────────────────────────────────────────
  const cursor    = document.getElementById(\'cursor\');
  const cursorRing = document.getElementById(\'cursorRing\');
  let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;

  document.addEventListener(\'mousemove\', e => {
    mouseX = e.clientX; mouseY = e.clientY;
    cursor.style.left = mouseX - 4 + \'px\';
    cursor.style.top  = mouseY - 4 + \'px\';
  });

  (function animRing() {
    ringX += (mouseX - ringX) * 0.12;
    ringY += (mouseY - ringY) * 0.12;
    cursorRing.style.left = ringX - 18 + \'px\';
    cursorRing.style.top  = ringY - 18 + \'px\';
    requestAnimationFrame(animRing);
  })();

  document.querySelectorAll(\'a, button\').forEach(el => {
    el.addEventListener(\'mouseenter\', () => { cursor.style.transform = \'scale(2)\'; cursorRing.style.transform = \'scale(1.4)\'; cursorRing.style.opacity = \'0.8\'; });
    el.addEventListener(\'mouseleave\', () => { cursor.style.transform = \'scale(1)\'; cursorRing.style.transform = \'scale(1)\'; cursorRing.style.opacity = \'0.5\'; });
  });
</script>
</body>
</html>
'''

html_out = HTML.replace('PRODUCTS_PLACEHOLDER', products_js)

with open(f'{BASE_DIR}/product.html', 'w', encoding='utf-8') as f:
    f.write(html_out)
print(f"Generated product.html with {len(products)} products")

# ──────────────────────────────────────────────────────────────────────────────
# 3.  PATCH LISTING PAGES — add click-to-navigate on prod-cards
# ──────────────────────────────────────────────────────────────────────────────

CARD_CLICK_JS = """
  // ─── PRODUCT CARD NAVIGATION ─────────────────────────────────────────────
  document.querySelectorAll('.prod-card').forEach(card => {
    card.addEventListener('click', function(e) {
      if (e.target.closest('.prod-cta')) return;
      const style = this.querySelector('.prod-style');
      if (style) window.location.href = 'product.html?style=' + encodeURIComponent(style.textContent.trim());
    });
  });
"""

LISTING_FILES = [
    'engagement-rings.html',
    'wedding-bands.html',
    'fine-jewelry.html',
    'mens.html',
]

for fname in LISTING_FILES:
    path = f'{BASE_DIR}/{fname}'
    with open(path, encoding='utf-8') as f:
        content = f.read()

    if 'PRODUCT CARD NAVIGATION' not in content:
        content = content.replace('</script>\n</body>', CARD_CLICK_JS + '</script>\n</body>', 1)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Patched click navigation: {fname}")
    else:
        print(f"Already patched: {fname}")

# Also make prod-card cursor:pointer (add to CSS if not present)
for fname in LISTING_FILES:
    path = f'{BASE_DIR}/{fname}'
    with open(path, encoding='utf-8') as f:
        content = f.read()
    # The .prod-card:hover rule already exists; just ensure cursor is set
    if '.prod-card { ' in content and 'cursor: pointer' not in content:
        content = content.replace(
            '.prod-card {\n    background: #fdf0ed;',
            '.prod-card {\n    cursor: pointer;\n    background: #fdf0ed;'
        )
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Added cursor:pointer to: {fname}")

print("\nAll done.")
