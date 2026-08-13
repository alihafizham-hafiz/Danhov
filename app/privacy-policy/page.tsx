import type { Metadata } from 'next';
import PolicyPage from '@/components/PolicyPage';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How DANHOV collects, uses, and protects your personal information when you browse, inquire, or place an order.',
  alternates: { canonical: '/privacy-policy' },
};

export default function PrivacyPolicyPage() {
  return (
    <PolicyPage
      slug="privacy-policy"
      title="Privacy Policy"
      intro="DANHOV respects your privacy. This policy explains what information we collect, how we use it, and the choices you have."
      sections={[
        {
          heading: 'Information we collect',
          body: [
            'When you place an order or make an inquiry, we collect the details you provide — your name, email address, shipping address, and order preferences. Payment details are handled securely by our payment processor (Authorize.Net) and are never stored on our servers.',
            'We also collect basic, non-identifying analytics about how the site is used so we can improve the experience.',
          ],
        },
        {
          heading: 'How we use it',
          body: [
            'We use your information to process and fulfil orders, confirm your commission, arrange shipping, provide customer care, and — only if you opt in — to send you occasional updates.',
            'We never sell your personal information.',
          ],
        },
        {
          heading: 'Your choices',
          body: [
            'You can request access to, correction of, or deletion of your personal information at any time by emailing care@danhov.com. You may unsubscribe from marketing messages using the link in any such email.',
          ],
        },
      ]}
    />
  );
}
