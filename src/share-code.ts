function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function encodeCodeToHash(code: string): string {
  const bytes = new TextEncoder().encode(code);
  return bytesToBase64(bytes);
}

export function decodeCodeFromHash(hash: string): string {
  const bytes = base64ToBytes(hash);
  return new TextDecoder().decode(bytes);
}
