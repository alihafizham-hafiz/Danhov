'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  token: string;
  formUrl: string;
  successUrl: string;
  cancelUrl: string;
};

declare global {
  interface Window {
    AuthorizeNetIFrame?: {
      onReceiveCommunication?: (query: string) => void;
    };
  }
}

function parseQueryString(input: string): Record<string, string> {
  const params: Record<string, string> = {};
  const clean = input.startsWith('#') ? input.slice(1) : input;
  for (const part of clean.split('&')) {
    if (!part) continue;
    const eq = part.indexOf('=');
    const key = eq >= 0 ? part.slice(0, eq) : part;
    const value = eq >= 0 ? part.slice(eq + 1) : '';
    try {
      params[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, ' '));
    } catch {
      params[key] = value;
    }
  }
  return params;
}

export default function PaymentFrame({ token, formUrl, successUrl, cancelUrl }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [frameHeight, setFrameHeight] = useState(640);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'idle' | 'complete' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    window.AuthorizeNetIFrame = {
      onReceiveCommunication(query) {
        const params = parseQueryString(query);

        if (params.action === 'resizeWindow') {
          const nextHeight = Number.parseInt(params.height || '', 10);
          if (Number.isFinite(nextHeight) && nextHeight > 0) {
            setFrameHeight(Math.min(Math.max(nextHeight, 560), 980));
          }
          setLoading(false);
          return;
        }

        if (params.action === 'cancel') {
          window.location.assign(cancelUrl);
          return;
        }

        if (params.action === 'transactResponse') {
          try {
            const response = params.response ? JSON.parse(params.response) : null;
            const responseCode = response?.responseCode?.toString();
            if (responseCode && !['1', '4'].includes(responseCode)) {
              setStatus('error');
              setMessage('Payment was not approved. Please review the card details and try again.');
              setLoading(false);
              return;
            }
          } catch {
            // Authorize.Net still sends this action only after submission.
          }

          setStatus('complete');
          setMessage('Payment received. Returning you to DANHOV...');
          window.setTimeout(() => window.location.assign(successUrl), 900);
        }
      },
    };

    const timer = window.setTimeout(() => {
      formRef.current?.submit();
    }, 120);

    return () => {
      window.clearTimeout(timer);
      if (window.AuthorizeNetIFrame) {
        window.AuthorizeNetIFrame.onReceiveCommunication = undefined;
      }
    };
  }, [cancelUrl, successUrl]);

  return (
    <section className="authpay-panel" aria-label="Secure payment form">
      <div className="authpay-frame-head">
        <div>
          <p className="authpay-kicker">Secure Card Payment</p>
          <h1>Complete your DANHOV order</h1>
        </div>
        <a className="authpay-cancel" href={cancelUrl}>Cancel</a>
      </div>

      <div className="authpay-frame-wrap" aria-busy={loading}>
        {loading && status === 'idle' && (
          <div className="authpay-loading">
            <span className="authpay-spinner" aria-hidden="true" />
            <span>Preparing secure payment form</span>
          </div>
        )}

        {message && (
          <div className={`authpay-status authpay-status--${status}`} role={status === 'error' ? 'alert' : 'status'}>
            {message}
          </div>
        )}

        <iframe
          ref={iframeRef}
          id="authnet-payment-frame"
          name="authnet-payment-frame"
          title="Authorize.Net secure payment form"
          src="/authorizenet-empty.html"
          style={{ height: frameHeight }}
          onLoad={() => setLoading(false)}
        />
      </div>

      <form ref={formRef} method="post" action={formUrl} target="authnet-payment-frame" hidden>
        <input type="hidden" name="token" value={token} />
      </form>

      <p className="authpay-footnote">
        Card details are entered inside Authorize.Net&apos;s secure hosted form. DANHOV never stores your card number.
      </p>
    </section>
  );
}
