/**
 * Authorize.Net API wrapper — Accept Hosted payment page.
 *
 * Required env vars:
 *   AUTHNET_API_LOGIN_ID    — from Account → API Credentials & Keys
 *   AUTHNET_TRANSACTION_KEY — from Account → API Credentials & Keys
 *   AUTHNET_SIGNATURE_KEY   — from Account → API Credentials & Keys
 *
 * Server-only. Never import in client code.
 */

const PRODUCTION_API_URL = 'https://api.authorize.net/xml/v1/request.api';
const SANDBOX_API_URL = 'https://apitest.authorize.net/xml/v1/request.api';

const PRODUCTION_FORM_URL = 'https://accept.authorize.net/payment/payment';
const SANDBOX_FORM_URL = 'https://test.authorize.net/payment/payment';

function isSandbox(): boolean {
  return process.env.AUTHNET_ENV?.toLowerCase() === 'sandbox';
}

function apiUrl(): string {
  return isSandbox() ? SANDBOX_API_URL : PRODUCTION_API_URL;
}

export function getAuthNetFormUrl(): string {
  return isSandbox() ? SANDBOX_FORM_URL : PRODUCTION_FORM_URL;
}

export function authNetConfigured(): boolean {
  return !!(process.env.AUTHNET_API_LOGIN_ID && process.env.AUTHNET_TRANSACTION_KEY);
}

export function getAuthNetSignatureKey(): string | undefined {
  return process.env.AUTHNET_SIGNATURE_KEY || process.env.AUTHNET_WEBHOOK_KEY;
}

function getAuth() {
  const name = process.env.AUTHNET_API_LOGIN_ID;
  const transactionKey = process.env.AUTHNET_TRANSACTION_KEY;
  if (!name || !transactionKey) throw new Error('AUTHNET_API_LOGIN_ID / AUTHNET_TRANSACTION_KEY not configured');
  return { name, transactionKey };
}

async function post<T = unknown>(body: object): Promise<T> {
  const res = await fetch(apiUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`AuthNet HTTP ${res.status}`);
  const raw = await res.text();
  return JSON.parse(raw.replace(/^\uFEFF/, '')) as T;
}

function invoiceRefFor(source: string): string {
  const clean = source.replace(/[^A-Za-z0-9-]/g, '').toUpperCase();
  if (clean.length <= 20) return clean;
  return `DH-${clean.replace(/-/g, '').slice(0, 17)}`;
}

export async function createHostedPaymentSession(args: {
  orderId: string;
  amountUsd: number;
  description: string;
  email: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ id: string; url: string }> {
  const invoiceRef = invoiceRefFor(args.orderId);
  const token = await getHostedPaymentToken({
    amountUsd: args.amountUsd,
    invoiceRef,
    description: args.description,
    email: args.email,
    successUrl: args.successUrl,
    cancelUrl: args.cancelUrl,
  });

  const bridgeUrl = new URL('/checkout/pay', args.successUrl);
  bridgeUrl.searchParams.set('token', token);
  bridgeUrl.searchParams.set('success', args.successUrl);
  bridgeUrl.searchParams.set('cancel', args.cancelUrl);
  return { id: invoiceRef, url: bridgeUrl.toString() };
}

/** Get a hosted-payment-page token for the given transaction. */
export async function getHostedPaymentToken(args: {
  amountUsd: number;
  invoiceRef: string;   // stored in stripe_checkout_session_id — max 20 chars
  description: string;
  email: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  const auth = getAuth();
  const communicatorUrl = new URL('/authorizenet-iframe-communicator.html', args.successUrl).toString();
  const data = await post<{ messages: { resultCode: string; message: { text: string }[] }; token: string }>({
    getHostedPaymentPageRequest: {
      merchantAuthentication: auth,
      transactionRequest: {
        transactionType: 'authCaptureTransaction',
        amount: args.amountUsd.toFixed(2),
        order: {
          invoiceNumber: args.invoiceRef.slice(0, 20),
          description: args.description.slice(0, 255),
        },
        customer: { email: args.email },
      },
      hostedPaymentSettings: {
        setting: [
          {
            settingName: 'hostedPaymentReturnOptions',
            settingValue: JSON.stringify({
              showReceipt: false,
              url: args.successUrl,
              urlText: 'Continue to DANHOV',
              cancelUrl: args.cancelUrl,
              cancelUrlText: 'Cancel',
            }),
          },
          {
            settingName: 'hostedPaymentButtonOptions',
            settingValue: JSON.stringify({ text: 'Complete Secure Payment' }),
          },
          {
            settingName: 'hostedPaymentStyleOptions',
            settingValue: JSON.stringify({ bgColor: '#AC3438' }),
          },
          {
            settingName: 'hostedPaymentPaymentOptions',
            settingValue: JSON.stringify({
              cardCodeRequired: true,
              showCreditCard: true,
              showBankAccount: false,
            }),
          },
          {
            settingName: 'hostedPaymentOrderOptions',
            settingValue: JSON.stringify({ show: true }),
          },
          {
            settingName: 'hostedPaymentSecurityOptions',
            settingValue: JSON.stringify({ captcha: false }),
          },
          {
            settingName: 'hostedPaymentIFrameCommunicatorUrl',
            settingValue: JSON.stringify({ url: communicatorUrl }),
          },
        ],
      },
    },
  });

  if (data.messages?.resultCode !== 'Ok') {
    const msg = data.messages?.message?.[0]?.text ?? 'Unknown error';
    throw new Error(`AuthNet: ${msg}`);
  }
  return data.token;
}

/** Verify a transaction ID directly with AuthNet. Returns the settle status. */
export async function getTransactionDetails(transId: string): Promise<{
  approved: boolean;
  amount: number;
  invoiceRef: string;
}> {
  const auth = getAuth();
  const data = await post<{
    messages: { resultCode: string };
    transaction?: {
      transactionStatus: string;
      authAmount: number;
      settleAmount: number;
      order?: { invoiceNumber?: string };
    };
  }>({
    getTransactionDetailsRequest: {
      merchantAuthentication: auth,
      transId,
    },
  });

  const tx = data.transaction;
  const approved =
    data.messages?.resultCode === 'Ok' &&
    !!tx &&
    ['settledSuccessfully', 'capturedPendingSettlement', 'authorizedPendingCapture'].includes(tx.transactionStatus);

  return {
    approved,
    amount: tx?.settleAmount ?? tx?.authAmount ?? 0,
    invoiceRef: tx?.order?.invoiceNumber ?? '',
  };
}
