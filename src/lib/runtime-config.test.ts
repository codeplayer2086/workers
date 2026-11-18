import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {
  getCookieSecurityOptions,
  isMysqlConfigured,
  resolveMysqlConfig,
  resolveUploadRoot,
} from './runtime-config';

test('isMysqlConfigured detects configured MySQL credentials vs unconfigured environment', () => {
  assert.equal(isMysqlConfigured({}), false);
  assert.equal(isMysqlConfigured({ MYSQL_DATABASE: 'db_only' }), false);
  assert.equal(isMysqlConfigured({ MYSQL_USER: 'root', MYSQL_DATABASE: 'maktab' }), true);
  assert.equal(isMysqlConfigured({ DATABASE_URL: 'mysql://u:p@host:3306/db' }), true);
});

test('resolveMysqlConfig uses DATABASE_URL or MYSQL_URL when provided', () => {
  const cfg = resolveMysqlConfig({
    DATABASE_URL: 'mysql://user:pass@mysql.hostinger.com:3306/u123_maktab',
    MYSQL_SSL: 'require',
  });
  assert.equal(cfg.uri, 'mysql://user:pass@mysql.hostinger.com:3306/u123_maktab');
  assert.deepEqual(cfg.ssl, { rejectUnauthorized: false });
});

test('resolveMysqlConfig falls back to MYSQL_* host parameters with port 3306', () => {
  const cfg = resolveMysqlConfig({
    MYSQL_HOST: '127.0.0.1',
    MYSQL_PORT: '3307',
    MYSQL_USER: 'maktab_user',
    MYSQL_PASSWORD: 'secret',
    MYSQL_DATABASE: 'maktab_db',
  });
  assert.equal(cfg.uri, undefined);
  assert.equal(cfg.host, '127.0.0.1');
  assert.equal(cfg.port, 3307);
  assert.equal(cfg.user, 'maktab_user');
  assert.equal(cfg.database, 'maktab_db');
  assert.equal(cfg.ssl, undefined);
});

test('resolveUploadRoot supports custom persistent UPLOAD_DIR or defaults to private_uploads', () => {
  assert.equal(
    resolveUploadRoot({}, '/srv/maktab'),
    path.resolve('/srv/maktab', 'private_uploads')
  );
  assert.equal(
    resolveUploadRoot({ UPLOAD_DIR: '/var/data/maktab-uploads' }, '/srv/maktab'),
    '/var/data/maktab-uploads'
  );
});

test('getCookieSecurityOptions adapts to HTTPS iframe/proxy vs local HTTP', () => {
  assert.deepEqual(getCookieSecurityOptions(true), {
    httpOnly: true,
    sameSite: 'none',
    secure: true,
    path: '/',
  });
  assert.deepEqual(getCookieSecurityOptions(false), {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
  });
});
