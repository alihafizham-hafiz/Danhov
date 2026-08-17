# DANHOV Atelier — Next.js + Supabase

The Atelier — AI-driven luxury jewelry experience platform for DANHOV.

## Stack
- **Next.js 14** (App Router, TypeScript)
- **Supabase** (Postgres + Storage + Auth)
- **Anthropic Claude** (text chat advisor — already wired)
- Future phases: OpenAI Realtime (voice), Stripe (deposits), GoldAPI (live metal pricing), Calendly/Zoom (consultations), Resend (email)

## Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

## Required env vars

Copy `.env.example` → `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` (server-side only)
- `ANTHROPIC_API_KEY`

## Deployment

Production deploys from `main` through Vercel. Before committing, configure
Git with an email address associated with your GitHub account so Vercel can
identify the commit author:

```bash
git config user.email "seniorcloser@gmail.com"
```

## Project structure

```
app/
  layout.tsx                    # Root layout: Nav, Footer, Cursor, ChatWidget
  page.tsx                      # Homepage
  engagement-rings/page.tsx
  wedding-bands/page.tsx
  fine-jewelry/page.tsx
  mens/page.tsx
  product/[slug]/page.tsx       # Dynamic product page (reads Supabase)
  api/
    chat/route.ts               # Claude advisor endpoint
  globals.css                   # Global styles (ported from legacy)
components/
  Nav.tsx, Footer.tsx, Cursor.tsx, ChatWidget.tsx
lib/
  supabase/client.ts            # Browser client
  supabase/server.ts            # Server client + service-role client
_legacy/                        # Original HTML files — reference only
public/                         # Static assets (logo, favicon)
```

## Migration status

- [x] Next.js scaffold
- [x] Global CSS ported
- [x] Nav, Footer, Cursor, ChatWidget components
- [x] Chat API route (App Router)
- [x] Supabase clients
- [ ] Homepage body fully ported (in progress — currently shows scaffold confirmation)
- [ ] Listing pages ported
- [ ] Product page wired to Supabase
- [ ] Seed script for product data
- [ ] Phase 2: Live precious-metals pricing
- [ ] Phase 3: Voice + video AI
- [ ] Phase 4: Stripe checkout, Calendly bookings, Resend emails
- [ ] Phase 5: Spiritual messaging engine + SEO/LLM optimization
