function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  // URL-safe alphabet keeps copied fragments free from `/`, `+`, and padding.
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64ToBytes(base64: string): Uint8Array {
  // Accept both the current unpadded Base64URL form and legacy padded Base64
  // links already shared from earlier playground versions.
  const normalized = base64.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  const binary = atob(`${normalized}${padding}`);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Keep generated share links below conservative browser/proxy URL limits.
// The local draft remains available even when a source is too large to share.
export const MAX_SHARE_URL_LENGTH = 180_000;

export function encodeCodeToHash(code: string): string {
  const bytes = new TextEncoder().encode(code);
  return bytesToBase64(bytes);
}

export function decodeCodeFromHash(hash: string): string {
  const bytes = base64ToBytes(hash);
  return new TextDecoder().decode(bytes);
}

export function buildShareUrl(baseUrl: string, code: string): string | null {
  const url = `${baseUrl}#${encodeCodeToHash(code)}`;
  return url.length <= MAX_SHARE_URL_LENGTH ? url : null;
}
