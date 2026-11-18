import crypto from 'node:crypto';
import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };

const PREFIX = 'enc:v1:';

function getVaultKey(secretOverride?: string): Buffer {
  const rawSecret =
    secretOverride ||
    process.env.PASSWORD_VAULT_SECRET ||
    process.env.SESSION_SECRET ||
    `${firebaseConfig.projectId}:${firebaseConfig.apiKey}:maktab-placement-vault`;
  return crypto.createHash('sha256').update(rawSecret).digest();
}

export function encryptPasswordForAdmin(plainText: string, secretOverride?: string): string {
  const key = getVaultKey(secretOverride);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptPasswordForAdmin(
  storedCipher: string | null | undefined,
  secretOverride?: string
): string | null {
  if (!storedCipher || !storedCipher.startsWith(PREFIX)) {
    return null;
  }
  const rest = storedCipher.slice(PREFIX.length);
  const parts = rest.split(':');
  if (parts.length !== 3) return null;

  const [ivHex, tagHex, dataHex] = parts;
  try {
    const key = getVaultKey(secretOverride);
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');
    const encrypted = Buffer.from(dataHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return null;
  }
}
