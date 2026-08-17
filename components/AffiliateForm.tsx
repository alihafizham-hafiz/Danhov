'use client';

import { useState } from 'react';

type State = 'idle' | 'submitting' | 'success' | 'error';

export default function AffiliateForm() {
  const [state, setState] = useState<State>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('submitting');
    setErrorMsg('');

    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem('name') as HTMLInputElement).value.trim(),
      email: (form.elements.namedItem('email') as HTMLInputElement).value.trim(),
      website: (form.elements.namedItem('website') as HTMLInputElement).value.trim(),
      platform: (form.elements.namedItem('platform') as HTMLSelectElement).value,
      audience: (form.elements.namedItem('audience') as HTMLSelectElement).value,
      about: (form.elements.namedItem('about') as HTMLTextAreaElement).value.trim(),
    };

    try {
      const res = await fetch('/api/affiliate/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as { error?: string }).error || 'Submission failed');
      }
      setState('success');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setState('error');
    }
  }

  if (state === 'success') {
    return (
      <div className="aff-success">
        <div className="aff-success-icon">✦</div>
        <h3 className="aff-success-title">Application received.</h3>
        <p className="aff-success-body">
          Thank you for applying. We review every application individually and
          you&apos;ll hear from us within two business days.
        </p>
      </div>
    );
  }

  return (
    <form className="aff-form" onSubmit={handleSubmit} noValidate>
      <div className="aff-form-row">
        <div className="aff-form-group">
          <label htmlFor="a-name">Full Name</label>
          <input id="a-name" name="name" type="text" required autoComplete="name" placeholder="Your name" />
        </div>
        <div className="aff-form-group">
          <label htmlFor="a-email">Email</label>
          <input id="a-email" name="email" type="email" required autoComplete="email" placeholder="you@email.com" />
        </div>
      </div>
      <div className="aff-form-group">
        <label htmlFor="a-website">Website / Profile URL</label>
        <input id="a-website" name="website" type="url" autoComplete="url" placeholder="https://yourwebsite.com or instagram.com/handle" />
      </div>
      <div className="aff-form-row">
        <div className="aff-form-group">
          <label htmlFor="a-platform">Primary Platform</label>
          <select id="a-platform" name="platform" autoComplete="off">
            <option value="">Select…</option>
            <option>Instagram</option>
            <option>Pinterest</option>
            <option>YouTube</option>
            <option>TikTok</option>
            <option>Blog / Website</option>
            <option>Email Newsletter</option>
            <option>Other</option>
          </select>
        </div>
        <div className="aff-form-group">
          <label htmlFor="a-audience">Audience Size</label>
          <select id="a-audience" name="audience" autoComplete="off">
            <option value="">Select…</option>
            <option>Under 5,000</option>
            <option>5,000 – 25,000</option>
            <option>25,000 – 100,000</option>
            <option>100,000 – 500,000</option>
            <option>500,000+</option>
          </select>
        </div>
      </div>
      <div className="aff-form-group">
        <label htmlFor="a-about">Tell us about your audience and why DANHOV is a fit</label>
        <textarea
          id="a-about"
          name="about"
          autoComplete="off"
          placeholder="My audience is primarily engaged couples in the US who follow me for wedding planning content…"
        />
      </div>
      {state === 'error' && (
        <p className="aff-form-error">{errorMsg}</p>
      )}
      <button type="submit" className="aff-submit" disabled={state === 'submitting'}>
        {state === 'submitting' ? 'Submitting…' : 'Submit Application'}
      </button>
    </form>
  );
}
