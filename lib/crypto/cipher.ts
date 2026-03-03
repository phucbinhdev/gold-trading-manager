/**
 * Simple AES-GCM encryption/decryption using the Web Crypto API.
 * This ensures zero-knowledge encryption: data is encrypted on the client side.
 */

async function getEncryptionKey(password: string) {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("baymax-tam-ky-salt"), // Constant salt for simplicity in this demo
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptText(text: string, password: string): Promise<string> {
  try {
    const key = await getEncryptionKey(password);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const encodedText = enc.encode(text);

    const encryptedContent = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encodedText
    );

    // Combine IV and Encrypted Content for storage
    const combined = new Uint8Array(iv.length + encryptedContent.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedContent), iv.length);

    return btoa(String.fromCharCode(...combined));
  } catch (e) {
    console.error("Encryption failed", e);
    throw new Error("Mã hóa thất bại");
  }
}

export async function decryptText(encryptedBase64: string, password: string): Promise<string> {
  try {
    const key = await getEncryptionKey(password);
    const combined = new Uint8Array(
      atob(encryptedBase64)
        .split("")
        .map((c) => c.charCodeAt(0))
    );

    const iv = combined.slice(0, 12);
    const encryptedContent = combined.slice(12);

    const decryptedContent = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      encryptedContent
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedContent);
  } catch (e) {
    console.error("Decryption failed", e);
    throw new Error("Mật mã không đúng hoặc dữ liệu lỗi");
  }
}
