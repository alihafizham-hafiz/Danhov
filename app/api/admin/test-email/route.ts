import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/admin-auth';
import { sendEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await sendEmail({
    to: 'care@danhov.com',
    subject: 'DANHOV Email Test — ' + new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }),
    html: `<!DOCTYPE html>
<html><body style="font-family:sans-serif;padding:40px;color:#3d2520;">
  <h2 style="color:#AC3438;">DANHOV Email Test</h2>
  <p>This is a test email sent from the DANHOV admin panel.</p>
  <p><strong>Sent at:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles', dateStyle: 'full', timeStyle: 'medium' })} PT</p>
  <p><strong>SMTP user:</strong> ${process.env.SMTP_USER ?? '(not set)'}</p>
  <p style="color:#7a5c58;margin-top:32px;">If you received this, email delivery is working correctly.</p>
</body></html>`,
    text: `DANHOV Email Test\n\nSent at: ${new Date().toISOString()}\nSMTP user: ${process.env.SMTP_USER ?? '(not set)'}\n\nIf you received this, email delivery is working correctly.`,
  });

  return NextResponse.json(result);
}
