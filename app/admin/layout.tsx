// import './globals.css';
import type { Metadata } from 'next';
import AdminShell from '@/components/admin/AdminShell';
import { getAdmin } from '@/lib/admin-auth';
import './admin.css';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s · DANHOV Admin' },
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAdmin();
  // If not authenticated (e.g. visiting /admin/login), render children
  // without the shell — the page provides its own full-bleed UI.
  if (!admin) {
    return <div className="admin-root admin-root--login">{children}</div>;
  }
  return (
    <div className="admin-root">
      <AdminShell admin={admin}>{children}</AdminShell>
    </div>
  );
}
