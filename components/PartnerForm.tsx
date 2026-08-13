'use client';

import { useState } from 'react';

type State = 'idle' | 'submitting' | 'success' | 'error';

export default function PartnerForm() {
  const [state, setState] = useState<State>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('submitting');
    setErrorMsg('');

    const fd = new FormData(e.currentTarget);
    const body = {
      first_name: fd.get('first_name') as string,
      last_name: fd.get('last_name') as string,
      email: fd.get('email') as string,
      phone: fd.get('phone') as string,
      business: fd.get('business') as string,
      business_type: fd.get('business_type') as string,
      country: fd.get('country') as string,
      website: fd.get('website') as string,
      message: fd.get('message') as string,
    };

    try {
      const res = await fetch('/api/partner/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || 'Submission failed.');
      setState('success');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setState('error');
    }
  }

  if (state === 'success') {
    return (
      <div style={{
        textAlign: 'center', padding: '56px 24px',
        background: '#fff', border: '1px solid #ede8e2', borderRadius: 8,
      }}>
        <div style={{ fontSize: 36, color: '#AC3438', marginBottom: 16 }}>◇</div>
        <h3 style={{ fontFamily: "var(--font-cormorant), 'Cormorant Garamond', serif", fontSize: 26, fontWeight: 400, color: '#1a1410', margin: '0 0 12px' }}>
          Application received.
        </h3>
        <p style={{ fontSize: 15, color: '#6b5e57', lineHeight: 1.7, maxWidth: 440, margin: '0 auto' }}>
          Thank you for your interest in partnering with DANHOV. Our trade team
          will review your application and respond within one business day.
        </p>
      </div>
    );
  }

  return (
    <form className="partner-form" onSubmit={handleSubmit} noValidate>
      <div className="partner-form-row">
        <div className="partner-form-group">
          <label htmlFor="p-first">First Name</label>
          <input id="p-first" name="first_name" type="text" required placeholder="Jack" autoComplete="given-name" />
        </div>
        <div className="partner-form-group">
          <label htmlFor="p-last">Last Name</label>
          <input id="p-last" name="last_name" type="text" required placeholder="Hovsepian" autoComplete="family-name" />
        </div>
      </div>
      <div className="partner-form-row">
        <div className="partner-form-group">
          <label htmlFor="p-email">Business Email</label>
          <input id="p-email" name="email" type="email" required placeholder="you@yourbusiness.com" autoComplete="email" />
        </div>
        <div className="partner-form-group">
          <label htmlFor="p-phone">Phone</label>
          <input id="p-phone" name="phone" type="tel" placeholder="+1 (555) 000-0000" autoComplete="tel" />
        </div>
      </div>
      <div className="partner-form-group">
        <label htmlFor="p-business">Business / Store Name</label>
        <input id="p-business" name="business" type="text" required placeholder="Your Jewelry Boutique" autoComplete="organization" />
      </div>
      <div className="partner-form-row">
        <div className="partner-form-group">
          <label htmlFor="p-type">Business Type</label>
          <select id="p-type" name="business_type">
            <option value="">Select type…</option>
            <option>Independent Jeweler</option>
            <option>Luxury Boutique</option>
            <option>Department Store</option>
            <option>Online Retailer</option>
            <option>Other</option>
          </select>
        </div>
        <div className="partner-form-group">
          <label htmlFor="p-country">Country</label>
          <input id="p-country" name="country" type="text" placeholder="United States" autoComplete="country-name" />
        </div>
      </div>
      <div className="partner-form-group">
        <label htmlFor="p-website">Website</label>
        <input id="p-website" name="website" type="url" placeholder="https://yourbusiness.com" autoComplete="url" />
      </div>
      <div className="partner-form-group">
        <label htmlFor="p-message">Tell us about your store and what you&apos;re looking for</label>
        <textarea
          id="p-message"
          name="message"
          placeholder="We carry luxury engagement rings and are looking to add a handcrafted Los Angeles brand…"
        />
      </div>
      {state === 'error' && (
        <p style={{ fontSize: 13, color: '#AC3438', padding: '10px 14px', background: 'rgba(172,52,56,0.06)', borderLeft: '3px solid #AC3438', borderRadius: 4, margin: 0 }}>
          {errorMsg}
        </p>
      )}
      <button
        type="submit"
        className="partner-submit"
        disabled={state === 'submitting'}
        style={{ opacity: state === 'submitting' ? 0.6 : 1 }}
      >
        {state === 'submitting' ? 'Sending…' : 'Submit Application'}
      </button>
    </form>
  );
}
