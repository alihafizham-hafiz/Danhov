import type { Metadata } from 'next';
import PolicyPage from '@/components/PolicyPage';

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description:
    'The terms governing your use of the DANHOV website and the purchase of DANHOV handcrafted jewelry.',
  alternates: { canonical: '/terms-of-use' },
};

export default function TermsPage() {
  return (
    <PolicyPage
      slug="terms-of-use"
      title="Terms & Conditions"
      intro="By using this website and placing an order with DANHOV, you agree to the following terms."
      sections={[
        {
          heading: 'Orders & pricing',
          body: [
            'Each piece is handcrafted to order. Prices shown are computed from the current metal market, the piece specification, and craftsmanship; a locked quote is honored for its stated duration. We reserve the right to confirm availability and final pricing before production begins.',
            'Every piece is handcrafted to order. Payment is collected at checkout to begin production.',
          ],
        },
        {
          heading: 'Custom & personalized pieces',
          body: [
            'Customized, engraved, or made-to-order personalized pieces are produced specifically for you and are handled case-by-case for changes or returns. Please review your specification carefully before confirming.',
          ],
        },
        {
          heading: 'Intellectual property',
          body: [
            'All content on this site — including designs, images, text, and the DANHOV name and marks — is the property of DANHOV and may not be reproduced without permission.',
          ],
        },
        {
          heading: 'Contact',
          body: [
            'Questions about these terms can be sent to care@danhov.com or by calling (424) 421-4072.',
          ],
        },
      ]}
    />
  );
}
