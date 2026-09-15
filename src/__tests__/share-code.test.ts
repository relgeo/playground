import { describe, expect, it } from 'vitest';
import { buildShareUrl, decodeCodeFromHash, encodeCodeToHash, MAX_SHARE_URL_LENGTH } from '../share-code';

describe('playground share code helpers', () => {
  it('round-trips ASCII DSL content', () => {
    const code = `version: 0.5
objects:
  panel:
    type: rect
    size: [120, 80]
`;

    const encoded = encodeCodeToHash(code);
    expect(decodeCodeFromHash(encoded)).toBe(code);
  });

  it('round-trips non-ASCII DSL content safely', () => {
    const code = `version: 0.5
meta:
  title: "Pintu Kiri"
objects:
  catatan:
    type: annotation
    text: "Ukuran façade 1200mm - sisi café"
`;

    const encoded = encodeCodeToHash(code);
    expect(decodeCodeFromHash(encoded)).toBe(code);
  });

  it('uses a URL-safe hash alphabet without padding', () => {
    const encoded = encodeCodeToHash('\u00fb'.repeat(32));

    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(encoded).not.toContain('=');
    expect(decodeCodeFromHash(encoded)).toBe('\u00fb'.repeat(32));
  });

  it('continues to decode legacy padded Base64 hashes', () => {
    const legacyHash = btoa('version: 0.5');

    expect(decodeCodeFromHash(legacyHash)).toBe('version: 0.5');
  });

  it('builds a bounded share URL for normal drafts', () => {
    const url = buildShareUrl('https://relgeo.github.io/playground/', 'version: 0.5');
    expect(url).toMatch(/^https:\/\/relgeo\.github\.io\/playground\/#/);
  });

  it('rejects a share URL that exceeds the conservative URL limit', () => {
    const oversizedCode = 'x'.repeat(MAX_SHARE_URL_LENGTH);
    expect(buildShareUrl('https://relgeo.github.io/playground/', oversizedCode)).toBeNull();
  });
});
