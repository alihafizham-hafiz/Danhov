/**
 * Branded Authorize.Net Accept Hosted payment page.
 * The surrounding checkout UI is DANHOV-owned; card fields remain inside
 * Authorize.Net's hosted iframe for PCI scope.
 */

import { getAuthNetFormUrl } from '@/lib/authorizenet';
import PaymentFrame from './PaymentFrame';

export const dynamic = 'force-dynamic';

type Search = { token?: string; cancel?: string; success?: string };

export default async function CheckoutPayPage({ searchParams }: { searchParams: Search }) {
  const token = searchParams.token ?? '';
  const cancelUrl = searchParams.cancel ?? '/';
  const successUrl = searchParams.success ?? '/order/success';

  if (!token) {
    return (
      <main className="authpay-page authpay-page--invalid">
        <div className="authpay-invalid">
          <p className="authpay-kicker">Secure Checkout</p>
          <h1>Invalid payment session.</h1>
          <a href={cancelUrl}>Return to DANHOV</a>
        </div>
      </main>
    );
  }

  return (
    <main className="authpay-page">
      <div className="authpay-shell">
        <aside className="authpay-summary" aria-label="Checkout summary">
          <p className="authpay-kicker">DANHOV Atelier</p>
          <h2>Securely complete your order.</h2>
          <p>
            Your payment is processed by Authorize.Net inside the protected form to the right.
            After approval, you will return to DANHOV for your order confirmation.
          </p>
          <div className="authpay-points">
            <span>Encrypted hosted card form</span>
            <span>DANHOV order confirmation</span>
            <span>Atelier follow-up within one business day</span>
          </div>
        </aside>

        <PaymentFrame
          token={token}
          formUrl={getAuthNetFormUrl()}
          successUrl={successUrl}
          cancelUrl={cancelUrl}
        />
      </div>
    </main>
  );
}
