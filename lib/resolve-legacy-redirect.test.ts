import { describe, it, expect } from 'vitest';
import { resolveBaseSku, resolveLegacyRedirect } from './resolve-legacy-redirect';
import { RAW_SKU_TOKEN_TO_BASE, BASE_SKU_TO_TARGET } from './legacy-redirects';

describe('resolveBaseSku', () => {
  it('resolves a known raw token to its base SKU', () => {
    const [knownToken, expectedBase] = Object.entries(RAW_SKU_TOKEN_TO_BASE)[0];
    expect(resolveBaseSku(knownToken)).toBe(expectedBase);
  });

  it('is case-insensitive', () => {
    const [knownToken, expectedBase] = Object.entries(RAW_SKU_TOKEN_TO_BASE)[0];
    expect(resolveBaseSku(knownToken.toLowerCase())).toBe(expectedBase);
  });

  it('returns the base SKU unchanged when it has no suffix and is already a valid base', () => {
    const [knownBase] = Object.entries(BASE_SKU_TO_TARGET)[0];
    expect(resolveBaseSku(knownBase)).toBe(knownBase);
  });

  it('returns null for a token with no known base and nothing strippable', () => {
    expect(resolveBaseSku('TOTALLYUNKNOWNSKU')).toBeNull();
  });

  it('recovers a base SKU that resolves only after stripping a metal/shape suffix', () => {
    // AE507UQ is a real base SKU (the exact one from the user's report);
    // AE507UQ-14R-XX isn't in the exact raw-token table, but should still
    // resolve via suffix stripping once it reaches "AE507UQ".
    expect(resolveBaseSku('AE507UQ-14R-XX')).toBe('AE507UQ');
  });
});

describe('resolveLegacyRedirect', () => {
  it('redirects /home to the root', () => {
    expect(resolveLegacyRedirect('/home')).toBe('/');
  });

  it("redirects the user's exact reported example: AE507UQ ring-builder URLs to the current setting page", () => {
    const target = resolveLegacyRedirect(
      '/ringbuilder/index/settingPost/sku/AE507UQ-14R/id/1234/category/3',
    );
    expect(target).toBe(BASE_SKU_TO_TARGET['AE507UQ']);
    expect(target).toBe('/ring-builder/setting/danhov-abbraccio-engagement-ring');
  });

  it('redirects every metal variant of the same SKU to the same single destination', () => {
    const variants = [
      '/ringbuilder/index/settingPost/sku/AE507UQ-14R/id/1/category/3',
      '/ringbuilder/index/settingPost/sku/AE507UQ-18W/id/2/category/3',
      '/ringbuilder/index/settingPost/sku/AE507UQ-18k-rose/id/3/category/3',
    ];
    const targets = new Set(variants.map(resolveLegacyRedirect));
    expect(targets.size).toBe(1);
    expect([...targets][0]).toBe('/ring-builder/setting/danhov-abbraccio-engagement-ring');
  });

  it("redirects the user's exact reported direct-slug examples to the same target", () => {
    const paths = [
      '/danhov-abbraccio-engagement-ring-ae507uq-14r',
      '/danhov-abbraccio-engagement-ring-ae507uq-18w',
      '/danhov-abbraccio-engagement-ring-ae507uq-18k-rose',
    ];
    for (const p of paths) {
      expect(resolveLegacyRedirect(p)).toBe('/ring-builder/setting/danhov-abbraccio-engagement-ring');
    }
  });

  it('falls back to /ring-builder for a ring-builder URL whose SKU no longer exists in the catalog — never a bare 404', () => {
    // A SKU guaranteed not to be in BASE_SKU_TO_TARGET.
    const target = resolveLegacyRedirect(
      '/ringbuilder/index/settingPost/sku/ZZZDISCONTINUEDZZZ-14R/id/1/category/3',
    );
    expect(target).toBe('/ring-builder');
  });

  it('does not force a redirect for an unrecognized /danhov- path with no resolvable SKU', () => {
    expect(resolveLegacyRedirect('/danhov-some-completely-made-up-page')).toBeNull();
  });

  it('returns null for ordinary current-site paths (must never intercept live routes)', () => {
    expect(resolveLegacyRedirect('/engagement-rings')).toBeNull();
    expect(resolveLegacyRedirect('/ring-builder/setting/danhov-abbraccio-engagement-ring')).toBeNull();
    expect(resolveLegacyRedirect('/')).toBeNull();
  });
});
