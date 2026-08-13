import { requireAdmin } from '@/lib/admin-auth';
import { createServiceClient } from '@/lib/supabase/server';
import PasswordForm from '@/components/admin/PasswordForm';
import SiteSettingsPanel from '@/components/admin/SiteSettingsPanel';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const admin = await requireAdmin();
  const sb = createServiceClient();

  const { data: rows } = await sb.from('site_settings').select('key, value');
  const settings: Record<string, string> = {};
  for (const r of rows ?? []) settings[r.key] = r.value;

  const integrations = {
    authNet: !!(process.env.AUTHNET_API_LOGIN_ID && process.env.AUTHNET_TRANSACTION_KEY),
    nivoda:  !!(process.env.NIVODA_USERNAME && process.env.NIVODA_PASSWORD),
    goldApi: !!process.env.GOLDAPI_TOKEN,
    resend:  !!process.env.RESEND_API_KEY,
    gemini:  !!process.env.GEMINI_API_KEY,
  };

  const envContact = {
    phoneDisplay: process.env.NEXT_PUBLIC_PHONE_DISPLAY?.replace(/\r/g, '') ?? '',
    phoneTel:     process.env.NEXT_PUBLIC_PHONE_TEL?.replace(/\r/g, '') ?? '',
    calendlyUrl:  process.env.NEXT_PUBLIC_CALENDLY_URL?.replace(/\r/g, '') ?? '',
    siteUrl:      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\r/g, '') ?? '',
  };

  return (
    <div className="adm-page">
      <div className="adm-page-head">
        <h1 className="adm-h1">Settings</h1>
        <p className="adm-page-sub">Business configuration, pricing defaults, and account management.</p>
      </div>

      <SiteSettingsPanel
        initialSettings={settings}
        integrations={integrations}
        envContact={envContact}
      />

      {/* Account — server-only sections stay here */}
      <section className="adm-card adm-card--narrow">
        <header className="adm-card-head"><h2 className="adm-h2">Account</h2></header>
        <div className="adm-fields">
          <div className="adm-field">
            <span className="adm-field-label">Email</span>
            <input className="adm-input" defaultValue={admin.email} readOnly />
          </div>
          <div className="adm-field">
            <span className="adm-field-label">Role</span>
            <input className="adm-input" defaultValue="Administrator" readOnly />
          </div>
        </div>
      </section>

      <section className="adm-card adm-card--narrow">
        <header className="adm-card-head"><h2 className="adm-h2">Change Password</h2></header>
        <PasswordForm />
      </section>
    </div>
  );
}
