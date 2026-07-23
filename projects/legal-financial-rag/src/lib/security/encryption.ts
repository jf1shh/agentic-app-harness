/**
 * Web Crypto API client-side AES-GCM 256-bit document encryption, PBKDF2 key derivation, and SHA-256 hashing.
 * 100% private, zero server communication.
 */

export async function generateMasterKey(): Promise<CryptoKey> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API is not available in this environment.');
  }
  return await window.crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function deriveKeyFromPassphrase(
  passphrase: string,
  saltHex?: string
): Promise<{ key: CryptoKey; saltHex: string }> {
  const encoder = new TextEncoder();
  const passphraseKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  let saltBytes: Uint8Array;
  if (saltHex) {
    saltBytes = new Uint8Array(
      saltHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );
  } else {
    saltBytes = window.crypto.getRandomValues(new Uint8Array(16));
  }

  const saltBuffer = new Uint8Array(saltBytes);

  const derivedKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passphraseKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  const generatedSaltHex = Array.from(saltBuffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return { key: derivedKey, saltHex: generatedSaltHex };
}

export async function exportKeyToHex(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey('raw', key);
  const hashArray = Array.from(new Uint8Array(exported));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function calculateSHA256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function encryptText(
  text: string,
  key: CryptoKey
): Promise<{ cipherTextHex: string; ivHex: string }> {
  const encoder = new TextEncoder();
  const encodedText = encoder.encode(text);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const cipherBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    encodedText
  );

  const cipherArray = Array.from(new Uint8Array(cipherBuffer));
  const cipherTextHex = cipherArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  const ivHex = Array.from(iv)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return { cipherTextHex, ivHex };
}

export async function decryptText(
  cipherTextHex: string,
  ivHex: string,
  key: CryptoKey
): Promise<string> {
  const cipherBytes = new Uint8Array(
    cipherTextHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
  );
  const ivBytes = new Uint8Array(
    ivHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
  );

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes,
    },
    key,
    cipherBytes
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}
