import crypto from 'node:crypto';

const KEY_LENGTH_BYTES = 64;
const HEX_KEY_REGEX = /^[0-9a-fA-F]{128}$/;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, KEY_LENGTH_BYTES).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(
  password: string,
  storedHash: string | null | undefined
): boolean {
  if (!password || !storedHash || typeof storedHash !== 'string') {
    return false;
  }
  const normalizedHash = storedHash.trim();
  const parts = normalizedHash.split(':');
  if (parts.length !== 2) return false;

  const [salt, keyHex] = parts;
  if (!salt || !HEX_KEY_REGEX.test(keyHex)) {
    return false;
  }

  try {
    const keyBuf = Buffer.from(keyHex, 'hex');
    const derivedBuf = crypto.scryptSync(password, salt, KEY_LENGTH_BYTES);
    if (keyBuf.length !== derivedBuf.length) return false;
    return crypto.timingSafeEqual(keyBuf, derivedBuf);
  } catch {
    return false;
  }
}
