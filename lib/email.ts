/**
 * Email — nodemailer via Gmail SMTP (care@danhov.com Google Workspace account).
 *
 * Required env vars:
 *   SMTP_USER  — care@danhov.com
 *   SMTP_PASS  — Gmail App Password (generated at myaccount.google.com/apppasswords)
 *
 * Server-only. Missing env vars skip the send without crashing.
 */

import nodemailer from 'nodemailer';

type EmailArgs = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

type SendResult = { sent: boolean; id?: string; error?: string };

function getTransport() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
  });
}

export async function sendEmail(args: EmailArgs): Promise<SendResult> {
  const transport = getTransport();
  if (!transport) {
    console.warn('[email] SMTP_USER / SMTP_PASS not set — skipping send', {
      to: args.to,
      subject: args.subject,
    });
    return { sent: false, error: 'SMTP not configured' };
  }

  const from = `DANHOV Atelier <${process.env.SMTP_USER}>`;

  try {
    const info = await transport.sendMail({
      from,
      to: Array.isArray(args.to) ? args.to.join(', ') : args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
      replyTo: args.replyTo ?? process.env.SMTP_USER,
    });
    return { sent: true, id: info.messageId };
  } catch (e) {
    console.error('[email] send failed', e);
    return { sent: false, error: e instanceof Error ? e.message : 'unknown' };
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Brand-styled template wrapper
// ──────────────────────────────────────────────────────────────────────────
function shell(title: string, body: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${escape(title)}</title></head>
<body style="margin:0;padding:0;background:#fff8f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#3d2520;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff8f6;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid rgba(172,52,56,0.10);">
        <tr><td style="padding:36px 44px 24px;text-align:center;border-bottom:1px solid rgba(172,52,56,0.08);">
          <div style="font-family:Georgia,'Cormorant Garamond',serif;font-size:24px;letter-spacing:0.4em;color:#AC3438;">DANHOV</div>
          <div style="margin-top:6px;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#7a5c58;">Atelier · Los Angeles · Est. 1984</div>
        </td></tr>
        <tr><td style="padding:32px 44px;font-size:15px;line-height:1.7;color:#3d2520;">${body}</td></tr>
        <tr><td style="padding:24px 44px 32px;text-align:center;background:#fff8f6;border-top:1px solid rgba(172,52,56,0.06);font-size:11px;line-height:1.7;color:#7a5c58;letter-spacing:0.04em;">
          <em style="font-family:Georgia,serif;font-size:13px;color:#7a5c58;">"Waves are the ocean."</em><br/>
          Handcrafted in Los Angeles since 1984.<br/>
          <a href="mailto:care@danhov.com" style="color:#AC3438;text-decoration:none;">care@danhov.com</a> · (424) 421-4072
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c)
  );
}

function btn(href: string, label: string): string {
  return `<div style="text-align:center;margin:24px 0;">
    <a href="${href}" style="display:inline-block;padding:14px 36px;background:#AC3438;color:#fff8f6;text-decoration:none;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;font-weight:600;">${escape(label)}</a>
  </div>`;
}

// ── Templates ────────────────────────────────────────────────────────────

export function quoteLockEmail(args: {
  productName: string;
  sku: string;
  metal: string;
  priceUsd: number;
  quoteId: string;
  expiresAt: string;
}): { subject: string; html: string; text: string } {
  const reference = args.quoteId.slice(0, 8).toUpperCase();
  const priceFmt = '$' + args.priceUsd.toLocaleString('en-US');
  const expires = new Date(args.expiresAt).toLocaleString('en-US', {
    weekday: 'long',
    hour: 'numeric',
    minute: 'numeric',
    timeZoneName: 'short',
  });

  const body = `
    <p style="margin:0 0 16px;font-family:Georgia,serif;font-size:22px;color:#AC3438;">Your price is locked.</p>
    <p style="margin:0 0 16px;">Thank you for considering the <strong>${escape(args.productName)}</strong>. The price below is guaranteed for the next 24 hours, regardless of market movement.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background:#fdf0ed;border:1px solid rgba(172,52,56,0.18);">
      <tr><td style="padding:24px;">
        <div style="font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#AC3438;font-weight:700;">Locked Price</div>
        <div style="font-size:32px;font-weight:700;color:#AC3438;margin-top:4px;">${priceFmt}</div>
        <div style="font-size:13px;color:#7a5c58;margin-top:2px;">in ${escape(args.metal.replace(/_/g, ' '))}</div>
        <hr style="border:none;border-top:1px solid rgba(172,52,56,0.10);margin:18px 0;"/>
        <div style="font-size:12px;color:#7a5c58;line-height:1.7;">
          Style: <strong>${escape(args.sku)}</strong><br/>
          Reference: <strong>${reference}</strong><br/>
          Expires: ${escape(expires)}
        </div>
      </td></tr>
    </table>
    <p style="margin:0 0 6px;">When you're ready, reply to this email or contact us by phone. Mention your reference code and we'll guide you through — a private consultation or any questions you have first.</p>`;

  return {
    subject: `Your DANHOV quote is locked — ${reference}`,
    html: shell('Your DANHOV quote is locked', body),
    text: `Your DANHOV price is locked.\n\nProduct: ${args.productName} (Style ${args.sku})\nMetal: ${args.metal}\nPrice: ${priceFmt}\nReference: ${reference}\nExpires: ${expires}\n\nReply to this email or call (424) 421-4072 when you're ready.\n\nWith love,\nDANHOV Atelier`,
  };
}

export function consultationConfirmEmail(args: {
  customerName?: string | null;
  scheduledAt: string | null;
  zoomLink?: string | null;
  notes?: string | null;
}): { subject: string; html: string; text: string } {
  const when = args.scheduledAt
    ? new Date(args.scheduledAt).toLocaleString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        timeZoneName: 'short',
      })
    : 'Time to be confirmed';

  const body = `
    <p style="margin:0 0 16px;font-family:Georgia,serif;font-size:22px;color:#AC3438;">Your private consultation is booked.</p>
    <p style="margin:0 0 16px;">${args.customerName ? escape(args.customerName) + ',' : 'Dear guest,'}</p>
    <p style="margin:0 0 16px;">A DANHOV specialist will meet you privately — one-to-one — to walk through every detail of your piece.</p>
    <div style="margin:24px 0;padding:18px 22px;background:#fdf0ed;border-left:3px solid #AC3438;">
      <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#AC3438;font-weight:700;">When</div>
      <div style="font-size:16px;color:#3d2520;margin-top:4px;">${escape(when)}</div>
    </div>
    ${args.zoomLink ? btn(args.zoomLink, 'Join the Consultation') : ''}
    ${args.notes ? `<p style="margin:16px 0;color:#7a5c58;font-style:italic;">"${escape(args.notes)}"</p>` : ''}
    <p style="margin:16px 0 0;">If anything changes on your end, simply reply to this email — we'll handle the rest.</p>`;

  return {
    subject: 'Your DANHOV private consultation is confirmed',
    html: shell('Consultation confirmed', body),
    text: `Your private DANHOV consultation is booked for ${when}.${args.zoomLink ? '\n\nJoin link: ' + args.zoomLink : ''}\n\nReply to this email if anything changes.\n\nWith love,\nDANHOV Atelier`,
  };
}

export function giftCardEmail(args: {
  recipientName: string;
  senderName: string;
  code: string;
  amountUsd: number;
  message?: string | null;
}): { subject: string; html: string; text: string } {
  const amount = '$' + args.amountUsd.toLocaleString('en-US');
  const msgBlock = args.message
    ? `<div style="margin:20px 0;padding:18px 24px;background:#fdf0ed;border-left:3px solid #AC3438;font-style:italic;color:#7a5c58;">"${escape(args.message)}"<br/><span style="display:block;margin-top:8px;font-style:normal;font-size:12px;color:#7a5c58;">— ${escape(args.senderName)}</span></div>`
    : '';

  const body = `
    <p style="margin:0 0 16px;font-family:Georgia,serif;font-size:22px;color:#AC3438;">You've received a gift.</p>
    <p style="margin:0 0 16px;">Dear ${escape(args.recipientName)},</p>
    <p style="margin:0 0 16px;"><strong>${escape(args.senderName)}</strong> has sent you a DANHOV gift card — a gesture as enduring as the jewelry itself.</p>
    ${msgBlock}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background:#fdf0ed;border:1px solid rgba(172,52,56,0.18);">
      <tr><td style="padding:28px 32px;text-align:center;">
        <div style="font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#AC3438;font-weight:700;margin-bottom:8px;">Your Gift Card</div>
        <div style="font-size:36px;font-weight:700;color:#AC3438;margin-bottom:6px;">${amount}</div>
        <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#7a5c58;margin-bottom:20px;">NEVER EXPIRES</div>
        <div style="font-size:15px;letter-spacing:0.22em;font-weight:700;color:#3d2520;background:#fff;padding:14px 24px;border:1px solid rgba(172,52,56,0.2);display:inline-block;border-radius:4px;">${escape(args.code)}</div>
        <p style="margin:12px 0 0;font-size:11px;color:#7a5c58;">Enter this code at checkout on danhov.com</p>
      </td></tr>
    </table>
    <div style="text-align:center;margin:24px 0;">
      <a href="https://danhov.com/engagement-rings" style="display:inline-block;padding:14px 36px;background:#AC3438;color:#fff8f6;text-decoration:none;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;font-weight:600;">EXPLORE THE COLLECTION</a>
    </div>
    <p style="margin:16px 0 0;font-size:13px;color:#7a5c58;text-align:center;">This gift card is redeemable on any engagement ring, wedding band, or fine jewelry piece — including custom commissions.</p>`;

  return {
    subject: `${escape(args.senderName)} sent you a DANHOV gift card — ${amount}`,
    html: shell('You have a DANHOV gift card', body),
    text: `Dear ${args.recipientName},\n\n${args.senderName} has sent you a DANHOV gift card worth ${amount}.\n\n${args.message ? `Message: "${args.message}"\n\n` : ''}Your code: ${args.code}\n\nEnter this code at checkout on danhov.com. It never expires.\n\nWith love,\nDANHOV Atelier`,
  };
}

export function depositReceiptEmail(args: {
  productName: string;
  sku: string;
  depositUsd: number;
  totalUsd: number;
  orderId: string;
}): { subject: string; html: string; text: string } {
  const ref = args.orderId.slice(0, 8).toUpperCase();
  const paid = '$' + args.depositUsd.toLocaleString('en-US');

  const body = `
    <p style="margin:0 0 16px;font-family:Georgia,serif;font-size:22px;color:#AC3438;">Your order has begun.</p>
    <p style="margin:0 0 16px;">Thank you. Your order secures the craftsmanship of the <strong>${escape(args.productName)}</strong> — and the next four to six weeks of master-jeweler hands turning gold into your piece.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background:#fdf0ed;border:1px solid rgba(172,52,56,0.18);">
      <tr><td style="padding:24px;">
        <div style="font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#AC3438;font-weight:700;">Order Reference</div>
        <div style="font-size:18px;color:#3d2520;margin-top:4px;font-weight:700;">${ref}</div>
        <hr style="border:none;border-top:1px solid rgba(172,52,56,0.10);margin:18px 0;"/>
        <div style="font-size:13px;color:#7a5c58;line-height:1.9;">
          Style: <strong>${escape(args.sku)}</strong><br/>
          Amount paid: <strong>${paid}</strong>
        </div>
      </td></tr>
    </table>
    <p style="margin:0 0 16px;">A specialist will be in touch within one business day to confirm details (size, engraving, stone preferences). Your piece will then ship via FedEx Priority Overnight, fully insured and signature-required.</p>
    <p style="margin:0 0 0;font-style:italic;color:#7a5c58;">"Presence is a present." — Jack</p>`;

  return {
    subject: `Your DANHOV order is confirmed — ${ref}`,
    html: shell('Order confirmed', body),
    text: `Your DANHOV order for ${args.productName} (Style ${args.sku}) has been confirmed.\n\nOrder reference: ${ref}\nAmount paid: ${paid}\n\nA specialist will be in touch within one business day.\n\nWith love,\nDANHOV Atelier`,
  };
}
