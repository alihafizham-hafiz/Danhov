/** Engagement products accept a separately selected centre stone. All other
 * categories are finished pieces whose listed stones are included in price. */
export function requiresCenterStone(centreDiamondGroup: { count?: number | null } | null | undefined): boolean {
  return Number(centreDiamondGroup?.count ?? 0) > 0;
}

export function purchaseModeLabel(centreDiamondGroup: { count?: number | null } | null | undefined): string {
  return requiresCenterStone(centreDiamondGroup)
    ? 'Setting + customer-selected centre diamond'
    : 'Finished piece with listed stones included';
}
