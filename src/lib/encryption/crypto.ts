import CryptoJS from "crypto-js";

const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || "";

/**
 * Encrypt a plaintext string using AES.
 * Optionally uses a store-specific salt for additional security.
 */
export function encryptField(data: string, salt?: string): string {
  if (!data) return "";
  const key = salt ? `${ENCRYPTION_KEY}-${salt}` : ENCRYPTION_KEY;
  return CryptoJS.AES.encrypt(data, key).toString();
}

/**
 * Decrypt an AES-encrypted string back to plaintext.
 * Must use the same salt that was used during encryption.
 */
export function decryptField(encryptedData: string, salt?: string): string {
  if (!encryptedData) return "";
  try {
    const key = salt ? `${ENCRYPTION_KEY}-${salt}` : ENCRYPTION_KEY;
    const bytes = CryptoJS.AES.decrypt(encryptedData, key);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    return "";
  }
}

/** Generate a SHA-256 hash of input data */
export function hashData(data: string): string {
  return CryptoJS.SHA256(data).toString();
}
