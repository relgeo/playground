import { describe, expect, it } from 'vitest';
import { decodeCodeFromHash, encodeCodeToHash } from '../share-code';

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
});
