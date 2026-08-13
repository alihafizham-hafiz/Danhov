import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  name: z.string().min(2).max(200),
  email: z.string().email().max(254),
  website: z.string().max(500).optional().default(''),
  platform: z.string().max(80).optional().default(''),
  audience: z.string().max(80).optional().default(''),
  about: z.string().max(3000).optional().default(''),
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid data submitted.' }, { status: 400 });
  }

  const sb = createServiceClient();
  const { error } = await sb.from('affiliate_applications').insert({
    name: body.name,
    email: body.email.toLowerCase(),
    website: body.website || null,
    platform: body.platform || null,
    audience_size: body.audience || null,
    about: body.about || null,
  });

  if (error) {
    console.error('affiliate/submit db error:', error.message);
    return NextResponse.json({ error: 'Could not save your application. Please try again.' }, { status: 500 });
  }

  // Confirmation to applicant
  await sendEmail({
    to: body.email,
    subject: 'Your DANHOV affiliate application is received',
    html: affiliateConfirmHtml(body.name),
    text: `Dear ${body.name},\n\nThank you for applying to the DANHOV Affiliate Program. Our team reviews every application individually and will respond within two business days.\n\nWith love,\nDANHOV Atelier`,
  });

  // Notify admin
  const adminEmail = process.env.ADMIN_EMAIL || 'rana@danhov.com';
  await sendEmail({
    to: adminEmail,
    subject: `New affiliate application — ${body.name}`,
    html: affiliateAdminHtml(body),
    replyTo: body.email,
  });

  return NextResponse.json({ ok: true });
}

function affiliateConfirmHtml(name: string): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#fff8f6;font-family:-apple-system,Helvetica,Arial,sans-serif;color:#3d2520;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff8f6;"><tr><td align="center" style="padding:40px 20px;">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid rgba(172,52,56,0.10);">
    <tr><td style="padding:36px 44px 24px;text-align:center;border-bottom:1px solid rgba(172,52,56,0.08);">
      <div style="font-family:Georgia,serif;font-size:24px;letter-spacing:0.4em;color:#AC3438;">DANHOV</div>
      <div style="margin-top:6px;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#7a5c58;">Atelier · Los Angeles · Est. 1984</div>
    </td></tr>
    <tr><td style="padding:32px 44px;font-size:15px;line-height:1.7;color:#3d2520;">
      <p style="margin:0 0 16px;font-family:Georgia,serif;font-size:22px;color:#AC3438;">Application received.</p>
      <p style="margin:0 0 16px;">Dear ${name},</p>
      <p style="margin:0 0 16px;">Thank you for applying to the DANHOV Affiliate Program. We review every application individually — you can expect a response from our team within <strong>two business days</strong>.</p>
      <p style="margin:0 0 16px;">While you wait, feel free to explore the collection at <a href="https://danhov.com" style="color:#AC3438;text-decoration:none;">danhov.com</a>.</p>
      <p style="margin:16px 0 0;font-style:italic;color:#7a5c58;">"Waves are the ocean." — Jack Danhov</p>
    </td></tr>
    <tr><td style="padding:20px 44px 28px;text-align:center;background:#fff8f6;border-top:1px solid rgba(172,52,56,0.06);font-size:11px;color:#7a5c58;">
      <a href="mailto:care@danhov.com" style="color:#AC3438;text-decoration:none;">care@danhov.com</a> · (424) 421-4072
    </td></tr>
  </table></td></tr></table></body></html>`;
}

function affiliateAdminHtml(body: z.infer<typeof Body>): string {
  return `<!DOCTYPE html><html><body style="font-family:Helvetica,Arial,sans-serif;color:#222;padding:24px;">
  <h2 style="color:#AC3438;">New Affiliate Application</h2>
  <table style="border-collapse:collapse;width:100%;max-width:560px;">
    <tr><td style="padding:8px 0;font-weight:600;width:140px;">Name</td><td style="padding:8px 0;">${body.name}</td></tr>
    <tr><td style="padding:8px 0;font-weight:600;">Email</td><td style="padding:8px 0;"><a href="mailto:${body.email}">${body.email}</a></td></tr>
    <tr><td style="padding:8px 0;font-weight:600;">Website</td><td style="padding:8px 0;">${body.website || '—'}</td></tr>
    <tr><td style="padding:8px 0;font-weight:600;">Platform</td><td style="padding:8px 0;">${body.platform || '—'}</td></tr>
    <tr><td style="padding:8px 0;font-weight:600;">Audience Size</td><td style="padding:8px 0;">${body.audience || '—'}</td></tr>
  </table>
  <p style="margin-top:16px;"><strong>About:</strong><br/>${body.about || '—'}</p>
  <p style="margin-top:20px;">
    <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://danhov.com'}/admin/affiliates"
       style="display:inline-block;padding:12px 28px;background:#AC3438;color:#fff;text-decoration:none;font-size:13px;letter-spacing:0.1em;text-transform:uppercase;">
      View in Admin
    </a>
  </p>
  </body></html>`;
}
