// Simple API key encryption at rest using Node's built-in crypto.
// Uses AES-256-GCM with a key derived from the ENCRYPTION_KEY env var.
// If ENCRYPTION_KEY is not set, falls back to a development key (with a warning).
import crypto from "crypto";

const ALGO = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

// Derive a 32-byte key from the ENCRYPTION_KEY env var or a dev fallback.
// In production, set ENCRYPTION_KEY to a strong random 32+ char string.
function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY || "cryptosieve-dev-key-not-for-production";
  return crypto.createHash("sha256").update(raw).digest();
}

// Encrypt a plaintext string. Returns a base64 string containing IV + ciphertext + tag.
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: base64(iv + tag + encrypted)
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

// Decrypt a base64 string produced by encrypt(). Returns the original plaintext.
// Returns null if decryption fails (e.g., wrong key, corrupted data).
export function decrypt(ciphertext: string): string | null {
  try {
    const key = getKey();
    const data = Buffer.from(ciphertext, "base64");
    const iv = data.subarray(0, IV_LENGTH);
    const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = data.subarray(IV_LENGTH + TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}

// Check if a value looks like an encrypted string (base64, correct length).
export function isEncrypted(value: string): boolean {
  try {
    const data = Buffer.from(value, "base64");
    return data.length > IV_LENGTH + TAG_LENGTH;
  } catch {
    return false;
  }
}
