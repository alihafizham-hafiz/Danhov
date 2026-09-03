-- ──────────────────────────────────────────────────────────────────────────
-- 001_init.sql — RECONSTRUCTED base schema
--
-- The original 001 migration (or manual Table Editor setup) that created
-- these tables was never committed to this repo / never included in what
-- was shared. This file was rebuilt by scanning every .from('table')
-- .select() / .insert() / .update() / .upsert() call across the actual
-- app code (app/, lib/, scripts/) so the columns match what the app
-- reads and writes.
--
-- Caveats (read before running):
--   • Exact data types/lengths/constraints for a few columns are best
--     guesses (e.g. numeric precision, text vs varchar). The app itself
--     doesn't care as long as the column name + rough type match.
--   • Any column NOT referenced anywhere in the app code could not be
--     recovered and is NOT included here.
--   • Safe to re-run (all "if not exists").
-- ──────────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

-- ── PRODUCTS ────────────────────────────────────────────────────────────
create table if not exists products (
  id                uuid primary key default gen_random_uuid(),
  sku               text unique not null,
  slug              text unique not null,
  name              text not null,
  description       text,
  collection        text,
  category          text,
  categories        jsonb default '[]'::jsonb,
  sub_categories    jsonb default '[]'::jsonb,
  metals            jsonb default '[]'::jsonb,
  default_metal     text,
  images            jsonb default '[]'::jsonb,
  metal_images      jsonb,
  price_display     text,
  is_active         boolean not null default true,
  gold_weight_g     numeric,
  markup_multiplier numeric,
  base_labor_usd    numeric default 0,
  custom_labor_usd  numeric default 0,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- ── CUSTOMERS ───────────────────────────────────────────────────────────
create table if not exists customers (
  email      text primary key,
  name       text,
  phone      text,
  notes      text,
  created_at timestamptz default now()
);

-- ── ORDERS ──────────────────────────────────────────────────────────────
create table if not exists orders (
  id                          uuid primary key default gen_random_uuid(),
  customer_email              text references customers(email),
  quote_lock_id               uuid,
  product_sku                 text,
  product_name                text,
  status                      text not null default 'pending',
  currency                    text default 'usd',
  deposit_usd                 numeric,
  total_usd                   numeric,
  shipping_cost_usd           numeric,
  shipping_country            text,
  shipping_address            jsonb,
  milestones                  jsonb default '[]'::jsonb,
  stripe_checkout_session_id  text,
  stripe_payment_intent_id    text,
  nivoda_offer_id             text,
  nivoda_order_id             text,
  custom_overrides            jsonb default '{}'::jsonb,
  labor_breakdown             jsonb default '{}'::jsonb,
  notes                       text,
  tracking_number             text,
  tracking_carrier            text,
  last_email_sent_at          timestamptz,
  created_at                  timestamptz default now(),
  updated_at                  timestamptz default now()
);

create index if not exists orders_stripe_session_idx on orders(stripe_checkout_session_id);
create index if not exists orders_customer_email_idx on orders(customer_email);

-- ── CONSULTATIONS ───────────────────────────────────────────────────────
create table if not exists consultations (
  id                  uuid primary key default gen_random_uuid(),
  customer_email      text,
  customer_name       text,
  notes               text,
  status              text not null default 'requested',
  scheduled_at        timestamptz,
  zoom_link           text,
  calendly_event_uri  text unique,
  created_at          timestamptz default now()
);

-- ── QUOTE_LOCKS ─────────────────────────────────────────────────────────
create table if not exists quote_locks (
  id                uuid primary key default gen_random_uuid(),
  product_id        uuid references products(id),
  customer_email    text,
  metal_choice      text,
  locked_price_usd  numeric,
  breakdown         jsonb,
  expires_at        timestamptz not null,
  consumed          boolean not null default false,
  created_at        timestamptz default now()
);

-- ── PRESENTATION_LINKS ──────────────────────────────────────────────────
create table if not exists presentation_links (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  customer_email  text,
  payload         jsonb,
  expires_at      timestamptz,
  viewed_at       timestamptz,
  created_at      timestamptz default now()
);

-- ── METAL_PRICES ────────────────────────────────────────────────────────
create table if not exists metal_prices (
  id                  uuid primary key default gen_random_uuid(),
  metal               text not null,
  price_per_gram_usd  numeric not null,
  source              text,
  fetched_at          timestamptz default now()
);

create index if not exists metal_prices_metal_idx on metal_prices(metal, fetched_at desc);

-- ── CONVERSATIONS ───────────────────────────────────────────────────────
create table if not exists conversations (
  id          uuid primary key default gen_random_uuid(),
  session_id  text unique not null,
  context     jsonb,
  modality    text,
  messages    jsonb default '[]'::jsonb,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── MEDIA_UPLOADS ───────────────────────────────────────────────────────
create table if not exists media_uploads (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid references conversations(id),
  kind             text,
  blob_url         text,
  mime_type        text,
  size_bytes       integer,
  processed_at     timestamptz,
  vision_analysis  jsonb,
  created_at       timestamptz default now()
);
