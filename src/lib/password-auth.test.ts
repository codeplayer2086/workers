import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from './password-auth';

test('hashPassword creates unique salted scrypt hashes and verifyPassword matches exact password', () => {
  const h1 = hashPassword('Staff@2026!');
  const h2 = hashPassword('Staff@2026!');

  assert.notEqual(h1, h2, 'each hash should use a fresh random salt');
  const [salt, key] = h1.split(':');
  assert.equal(salt.length, 32);
  assert.equal(key.length, 128);

  assert.equal(verifyPassword('Staff@2026!', h1), true);
  assert.equal(verifyPassword('Staff@2026!', h2), true);
  assert.equal(verifyPassword('Wrong@2026!', h1), false);
  assert.equal(verifyPassword('Staff@2026! ', h1), false);
});

test('verifyPassword supports unicode and special characters cleanly', () => {
  const pwd = 'P@ss#2026_دكا!';
  const hashed = hashPassword(pwd);
  assert.equal(verifyPassword(pwd, hashed), true);
  assert.equal(verifyPassword('P@ss#2026_دكا', hashed), false);
});

test('verifyPassword safely rejects plaintext, malformed, empty, or null stored hashes', () => {
  assert.equal(verifyPassword('plaintext123', 'plaintext123'), false);
  assert.equal(verifyPassword('Staff@1234', 'salt:not-valid-hex'), false);
  assert.equal(verifyPassword('Staff@1234', ':deadbeef'), false);
  assert.equal(verifyPassword('Staff@1234', ''), false);
  assert.equal(verifyPassword('Staff@1234', null), false);
  assert.equal(verifyPassword('Staff@1234', undefined), false);
  assert.equal(verifyPassword('', hashPassword('Staff@1234')), false);
});

test('verifyPassword tolerates accidental whitespace around a stored hash string', () => {
  const hashed = hashPassword('Employee#99');
  assert.equal(verifyPassword('Employee#99', `  ${hashed}\n`), true);
});
