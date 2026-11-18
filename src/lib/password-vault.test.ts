import test from 'node:test';
import assert from 'node:assert/strict';
import { decryptPasswordForAdmin, encryptPasswordForAdmin } from './password-vault';

test('encryptPasswordForAdmin and decryptPasswordForAdmin round-trip passwords cleanly', () => {
  const secret = 'test-vault-secret-key';
  const encrypted = encryptPasswordForAdmin('Agent@2026!', secret);

  assert.ok(encrypted.startsWith('enc:v1:'));
  assert.notEqual(encrypted, 'Agent@2026!');
  assert.equal(decryptPasswordForAdmin(encrypted, secret), 'Agent@2026!');
});

test('decryptPasswordForAdmin handles null, malformed, or wrong-secret payloads safely', () => {
  const encrypted = encryptPasswordForAdmin('Secret#99', 'secret-a');
  assert.equal(decryptPasswordForAdmin(null), null);
  assert.equal(decryptPasswordForAdmin('not-encrypted'), null);
  assert.equal(decryptPasswordForAdmin(encrypted, 'wrong-secret'), null);
});
