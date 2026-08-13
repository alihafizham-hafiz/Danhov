'use client';

import { useState } from 'react';

type Props = {
  initialSettings: Record<string, string>;
  integrations: { authNet: boolean; nivoda: boolean; goldApi: boolean; resend: boolean; gemini: boolean };
  envContact: { phoneDisplay: string; phoneTel: string; calendlyUrl: string; siteUrl: string };
};

type SettingDef = {
  key: string;
  label: string;
  desc: string;
  type?: 'number' | 'text' | 'email' | 'url';
  prefix?: string;
  suffix?: string;
  step?: string;
  min?: string;
};

// ── SettingRow ────────────────────────────────────────────────────────────────

function SettingRow({
  def, value, onSave,
}: {
  def: SettingDef;
  value: string;
  onSave: (key: string, value: string) => Promise<void>;
}) {
  const [val, setVal] = useState(value);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const dirty = val !== value;

  async function save() {
    if (!dirty) return;
    setSaving(true);
    await onSave(def.key, val);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center',
      gap: 12, padding: '11px 14px',
      background: 'var(--adm-surface)', border: '1px solid var(--adm-line)', borderRadius: 6,
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{def.label}</div>
        <div style={{ fontSize: 11, color: 'var(--adm-mute)', marginTop: 1 }}>{def.desc}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {def.prefix && <span style={{ fontSize: 12, color: 'var(--adm-mute)' }}>{def.prefix}</span>}
        <input
          type={def.type ?? 'text'}
          step={def.step}
          min={def.min}
          value={val}
          onChange={e => setVal(e.target.value)}
          style={{
            width: def.type === 'number' ? 72 : 180,
            padding: '5px 8px', fontSize: 13,
            border: '1px solid var(--adm-line)', borderRadius: 4,
            fontFamily: 'inherit', textAlign: def.type === 'number' ? 'center' : 'left',
            background: dirty ? '#fffbf0' : 'var(--adm-bg)',
            outline: 'none',
          }}
        />
        {def.suffix && <span style={{ fontSize: 12, color: 'var(--adm-mute)' }}>{def.suffix}</span>}
        <button
          onClick={save}
          disabled={saving || !dirty}
          style={{
            padding: '5px 14px', fontSize: 12, borderRadius: 4,
            cursor: dirty ? 'pointer' : 'default',
            background: saved ? 'var(--adm-ok)' : dirty ? 'var(--adm-accent)' : 'transparent',
            color: (saved || dirty) ? '#fff' : 'var(--adm-mute)',
            border: '1px solid ' + (saved ? 'var(--adm-ok)' : dirty ? 'var(--adm-accent)' : 'var(--adm-line)'),
            transition: 'all 0.15s', opacity: saving ? 0.6 : 1,
            minWidth: 62, fontFamily: 'inherit',
          }}
        >
          {saved ? '✓ Saved' : saving ? '…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

// ── Read-only env row ─────────────────────────────────────────────────────────

function EnvRow({ label, desc, value }: { label: string; desc: string; value: string }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center',
      gap: 12, padding: '11px 14px',
      background: '#faf9f8', border: '1px solid var(--adm-line)', borderRadius: 6,
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--adm-mute)', marginTop: 1 }}>{desc}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--adm-text)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value || <em style={{ color: 'var(--adm-mute)' }}>not set</em>}
        </span>
        <span style={{
          fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
          background: 'var(--adm-line)', color: 'var(--adm-mute)',
          padding: '2px 7px', borderRadius: 3,
        }}>Vercel Env</span>
      </div>
    </div>
  );
}

// ── Integration badge ─────────────────────────────────────────────────────────

function IntegrationRow({ label, desc, connected }: { label: string; desc: string; connected: boolean }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '12px 1fr auto', alignItems: 'center',
      gap: 10, padding: '11px 14px',
      background: 'var(--adm-surface)', border: '1px solid var(--adm-line)', borderRadius: 6,
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
        background: connected ? 'var(--adm-ok)' : '#ccc',
        boxShadow: connected ? '0 0 0 2px rgba(44,128,84,0.18)' : 'none',
      }} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--adm-mute)', marginTop: 1 }}>{desc}</div>
      </div>
      <span style={{
        fontSize: 11, fontWeight: 500,
        color: connected ? 'var(--adm-ok)' : 'var(--adm-mute)',
      }}>
        {connected ? 'Connected' : 'Not configured'}
      </span>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function SettingsCard({
  title, subtitle, children, cols = 1,
}: {
  title: string; subtitle?: string; children: React.ReactNode; cols?: 1 | 2;
}) {
  return (
    <section className="adm-card">
      <header className="adm-card-head">
        <h2 className="adm-h2">{title}</h2>
        {subtitle && <span style={{ fontSize: 12, color: 'var(--adm-mute)' }}>{subtitle}</span>}
      </header>
      <div style={{
        display: 'grid',
        gridTemplateColumns: cols === 2 ? '1fr 1fr' : '1fr',
        gap: 8,
      }}>
        {children}
      </div>
    </section>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function SiteSettingsPanel({ initialSettings, integrations, envContact }: Props) {
  const [settings, setSettings] = useState<Record<string, string>>(initialSettings);

  async function handleSave(key: string, value: string) {
    const res = await fetch('/api/admin/site-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
    if (res.ok) setSettings(prev => ({ ...prev, [key]: value }));
  }

  function row(def: SettingDef) {
    return (
      <SettingRow
        key={def.key}
        def={def}
        value={settings[def.key] ?? ''}
        onSave={handleSave}
      />
    );
  }

  return (
    <>
      {/* ── Business Contact ── */}
      <SettingsCard
        title="Business Contact"
        subtitle="Customer-facing contact details"
        cols={2}
      >
        {row({ key: 'care_email', label: 'Care Email', desc: 'Used in order confirmations and transactional emails', type: 'email' })}
        <EnvRow label="Phone Display" desc="Shown in the nav and booking modal" value={envContact.phoneDisplay} />
        <EnvRow label="Phone Tel Link" desc="Dialer href (must include country code)" value={envContact.phoneTel} />
        <EnvRow label="Calendly URL" desc="Virtual meeting booking link" value={envContact.calendlyUrl} />
        <EnvRow label="Site URL" desc="Used in SEO canonical links and emails" value={envContact.siteUrl} />
      </SettingsCard>

      {/* ── Pricing Defaults ── */}
      <SettingsCard
        title="Pricing Defaults"
        subtitle="Applied when creating new products — does not retroactively change existing products"
        cols={2}
      >
        {row({ key: 'casting_labor_per_gram', label: 'Casting Labor / gram', desc: 'Charged per gram of metal cast', type: 'number', prefix: '$', step: '0.5', min: '0' })}
        {row({ key: 'setting_multiplier', label: 'Stone Setting Fee / stone', desc: 'Labor cost per accent stone set', type: 'number', prefix: '$', step: '0.5', min: '0' })}
        {row({ key: 'default_markup_multiplier', label: 'Default Markup Multiplier', desc: 'Starting price multiplier on new products', type: 'number', suffix: '×', step: '0.5', min: '1' })}
        {row({ key: 'labor_3d_run', label: '3D Print / CAD Run', desc: 'Flat fee per product for 3D modeling & print', type: 'number', prefix: '$', step: '1', min: '0' })}
        {row({ key: 'labor_rhodium', label: 'Rhodium Plating (labor)', desc: 'Labor cost for rhodium plating treatment', type: 'number', prefix: '$', step: '1', min: '0' })}
        {row({ key: 'labor_laser_engraving', label: 'Laser Engraving', desc: 'Flat fee for laser engraving service', type: 'number', prefix: '$', step: '1', min: '0' })}
      </SettingsCard>

      {/* ── Metal Cost Constants ── */}
      <SettingsCard
        title="Metal Cost Constants"
        subtitle="Alloy and treatment costs added on top of live spot prices"
        cols={2}
      >
        {row({ key: 'alloy_cost_per_gram', label: 'Alloy Cost / gram', desc: 'Added to gold spot price per gram of metal', type: 'number', prefix: '$', step: '0.25', min: '0' })}
        {row({ key: 'iridium_spot_usd_per_g', label: 'Iridium Spot Price', desc: 'Used for platinum iridium alloy pricing', type: 'number', prefix: '$', suffix: '/g', step: '1', min: '0' })}
        {row({ key: 'rhodium_uplift_14k_white', label: 'Rhodium Uplift — 14k White', desc: 'Added to 14k white gold metal cost per piece', type: 'number', prefix: '$', step: '5', min: '0' })}
        {row({ key: 'rhodium_uplift_18k_white', label: 'Rhodium Uplift — 18k White', desc: 'Added to 18k white gold metal cost per piece', type: 'number', prefix: '$', step: '5', min: '0' })}
      </SettingsCard>

      {/* ── Orders ── */}
      <SettingsCard
        title="Orders & Checkout"
        subtitle="Payment and quote configuration"
        cols={2}
      >
        {row({ key: 'deposit_percent', label: 'Deposit Required', desc: 'Percentage of total charged at checkout (100 = full payment)', type: 'number', suffix: '%', step: '5', min: '0' })}
        {row({ key: 'quote_lock_hours', label: 'Quote Lock Duration', desc: 'How long a price quote is held before expiring', type: 'number', suffix: 'hrs', step: '1', min: '1' })}
      </SettingsCard>

      {/* ── Integrations ── */}
      <SettingsCard
        title="Integrations"
        subtitle="API key status — configure via Vercel environment variables"
        cols={2}
      >
        <IntegrationRow label="Authorize.Net" desc="Hosted card checkout processing" connected={integrations.authNet} />
        <IntegrationRow label="Nivoda" desc="Live diamond inventory feed" connected={integrations.nivoda} />
        <IntegrationRow label="GoldAPI" desc="Live gold and platinum spot prices" connected={integrations.goldApi} />
        <IntegrationRow label="Resend" desc="Transactional email delivery" connected={integrations.resend} />
        <IntegrationRow label="Gemini AI" desc="AI assistant and product descriptions" connected={integrations.gemini} />
      </SettingsCard>
    </>
  );
}
