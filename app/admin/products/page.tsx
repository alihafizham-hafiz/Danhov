import Link from 'next/link';
import Image from 'next/image';
import { requireAdmin } from '@/lib/admin-auth';
import { createServiceClient } from '@/lib/supabase/server';
import PaginationControls from '@/components/admin/PaginationControls';
import AdminSearchBar from '@/components/admin/AdminSearchBar';
import { resolveProductImage } from '@/lib/local-product-images';

export const dynamic = 'force-dynamic';

const DEFAULT_PER_PAGE = 25;

type Search = { q?: string; category?: string; page?: string; per_page?: string };

type ProductRow = {
  sku: string;
  name: string;
  category: string;
  collection: string;
  metals: string[];
  images: string[];
  is_active: boolean;
  updated_at: string | null;
};

function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function productThumb(row: ProductRow): string | null {
  return resolveProductImage(row.sku, row.images);
}

export default async function AdminProductsPage({ searchParams }: { searchParams: Search }) {
  await requireAdmin();
  const sb = createServiceClient();

  const perPage = Number(searchParams.per_page) || DEFAULT_PER_PAGE;
  const currentPage = Math.max(1, Number(searchParams.page) || 1);
  const offset = (currentPage - 1) * perPage;

  let query = sb
    .from('products')
    .select('sku, name, category, collection, metals, images, is_active, updated_at', { count: 'exact' })
    .order('name');

  if (searchParams.category) query = query.eq('category', searchParams.category);
  if (searchParams.q) {
    const q = searchParams.q.trim();
    query = query.ilike('sku', `${q}%`);
  }

  const { data: products, count } = await query.range(offset, offset + perPage - 1);
  const list = (products ?? []) as ProductRow[];
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));

  function buildHref(overrides: Record<string, string | undefined>) {
    const merged: Record<string, string> = {};
    if (searchParams.q) merged.q = searchParams.q;
    if (searchParams.category) merged.category = searchParams.category;
    merged.page = String(currentPage);
    merged.per_page = String(perPage);
    Object.entries(overrides).forEach(([k, v]) => {
      if (v !== undefined) merged[k] = v;
      else delete merged[k];
    });
    const p = new URLSearchParams(merged);
    const str = p.toString();
    return `/admin/products${str ? `?${str}` : ''}`;
  }

  // Build base path (without page/per_page) for PaginationControls
  const baseParams = new URLSearchParams();
  if (searchParams.q) baseParams.set('q', searchParams.q);
  if (searchParams.category) baseParams.set('category', searchParams.category);
  const basePath = `/admin/products${baseParams.toString() ? `?${baseParams.toString()}` : ''}`;

  const categories = [
    { key: '',           label: 'All'           },
    { key: 'engagement', label: 'Engagement'    },
    { key: 'wedding',    label: 'Wedding Bands' },
    { key: 'fine',       label: 'Fine Jewelry'  },
    { key: 'mens',       label: "Men's"         },
  ];

  return (
    <div className="adm-page">
      <header className="adm-page-head adm-page-head--with-actions">
        <div>
          <h1 className="adm-h1">Products</h1>
          <p className="adm-page-sub">
            {totalCount} products · showing {offset + 1}–{Math.min(offset + perPage, totalCount)}
          </p>
        </div>
        <Link href="/admin/products/new" className="adm-btn adm-btn-primary">
          + New product
        </Link>
      </header>

      {/* Category filter pills */}
      <div className="adm-filter-pills">
        {categories.map(({ key, label }) => {
          const active = (!searchParams.category && key === '') || searchParams.category === key;
          return (
            <a key={key} href={buildHref({ category: key || undefined, page: '1' })}
              className={`adm-filter-pill${active ? ' is-active' : ''}`}>
              {label}
            </a>
          );
        })}
      </div>

      {/* Search toolbar */}
      <div className="adm-toolbar">
        <AdminSearchBar
          defaultValue={searchParams.q}
          category={searchParams.category}
          perPage={perPage}
        />
        {(searchParams.q || searchParams.category) && (
          <Link href="/admin/products" className="adm-link">Reset</Link>
        )}
      </div>

      {/* Products table */}
      <div className="adm-card adm-card--flush">
        <table className="adm-table adm-table--products">
          <thead>
            <tr>
              <th></th>
              <th>SKU</th>
              <th>Name</th>
              <th>Collection</th>
              <th>Category</th>
              <th>Metals</th>
              <th>Status</th>
              <th>Last edited</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => {
              const hero = productThumb(p);
              return (
                <tr key={p.sku}>
                  <td className="adm-cell-thumb">
                    {hero ? (
                      <Image src={hero} alt={p.name} width={80} height={80} style={{ objectFit: 'cover' }} unoptimized={hero.includes('.supabase.co') || hero.includes('danhov.com')} />
                    ) : (
                      <span className="adm-thumb-empty">—</span>
                    )}
                  </td>
                  <td className="adm-mono">{p.sku}</td>
                  <td className="adm-cell-name">{p.name}</td>
                  <td>{p.collection || '—'}</td>
                  <td className="adm-cap">{p.category}</td>
                  <td style={{ fontSize: 11, color: 'var(--adm-mute)' }}>
                    {p.metals?.length ?? 0} options
                  </td>
                  <td>
                    <span className={`adm-pill adm-pill--${p.is_active ? 'active' : 'inactive'}`}>
                      {p.is_active ? 'active' : 'inactive'}
                    </span>
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--adm-mute)', whiteSpace: 'nowrap' }}>
                    {timeAgo(p.updated_at)}
                  </td>
                  <td className="adm-cell-actions">
                    <Link href={`/admin/products/${encodeURIComponent(p.sku)}`} className="adm-link">
                      Edit →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {list.length === 0 && <div className="adm-empty">No products match.</div>}
      </div>

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        perPage={perPage}
        basePath={basePath}
      />
    </div>
  );
}
