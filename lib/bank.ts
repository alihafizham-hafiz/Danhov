/**
 * Bank transfer (ACH) details for the "pay by bank" checkout option.
 *
 * Values come from env only and are never committed: this repo's `origin`
 * remote is a public GitHub repo, so an account number in source would be
 * published and would persist in git history. Set in Vercel:
 *   BANK_NAME, BANK_ACCOUNT_NAME, BANK_ACCOUNT_TYPE,
 *   BANK_ROUTING_NUMBER, BANK_ACCOUNT_NUMBER
 *
 * Server-only — do not import from a client component.
 */

export type BankDetails = {
  bankName: string;
  accountName: string;
  accountType: string;
  routingNumber: string;
  accountNumber: string;
};

/** Full details, incl. the account number. Null when not configured. */
export function getBankDetails(): BankDetails | null {
  const bankName = process.env.BANK_NAME?.trim();
  const accountName = process.env.BANK_ACCOUNT_NAME?.trim();
  const routingNumber = process.env.BANK_ROUTING_NUMBER?.trim();
  const accountNumber = process.env.BANK_ACCOUNT_NUMBER?.trim();

  if (!bankName || !accountName || !routingNumber || !accountNumber) return null;

  return {
    bankName,
    accountName,
    accountType: process.env.BANK_ACCOUNT_TYPE?.trim() || 'checking',
    routingNumber,
    accountNumber,
  };
}

/** Whether the bank-transfer option should be offered at checkout. */
export function bankTransferEnabled(): boolean {
  return getBankDetails() !== null;
}

/** Marker stored on a milestone so bank orders are identifiable without a
 *  schema change (the orders table has no payment_method column). */
export const BANK_METHOD = 'bank_transfer';
