import path from 'node:path';

export interface ResolvedMysqlConfig {
  uri?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  ssl?: { rejectUnauthorized: boolean };
}

export function isMysqlConfigured(env: Record<string, string | undefined>): boolean {
  const uri = (env.DATABASE_URL || env.MYSQL_URL || '').trim();
  if (uri.length > 0) return true;
  const dbName = (env.MYSQL_DATABASE || env.DB_NAME || '').trim();
  const user = (env.MYSQL_USER || env.DB_USER || '').trim();
  return dbName.length > 0 && user.length > 0;
}

export function resolveMysqlConfig(
  env: Record<string, string | undefined>
): ResolvedMysqlConfig {
  const sslMode = (env.MYSQL_SSL || env.DB_SSL || '').trim().toLowerCase();
  const ssl =
    sslMode === 'true' || sslMode === '1' || sslMode === 'require'
      ? { rejectUnauthorized: false }
      : undefined;

  const uri = (env.DATABASE_URL || env.MYSQL_URL || '').trim();
  if (uri.length > 0) {
    return {
      uri,
      ...(ssl ? { ssl } : {}),
    };
  }

  return {
    host: env.MYSQL_HOST || env.DB_HOST || '127.0.0.1',
    port: Number(env.MYSQL_PORT || env.DB_PORT || 3306),
    user: env.MYSQL_USER || env.DB_USER,
    password: env.MYSQL_PASSWORD || env.DB_PASSWORD,
    database: env.MYSQL_DATABASE || env.DB_NAME,
    ...(ssl ? { ssl } : {}),
  };
}

export function resolveUploadRoot(
  env: Record<string, string | undefined>,
  cwd: string = process.cwd()
): string {
  const custom = env.UPLOAD_DIR?.trim();
  if (custom) {
    return path.resolve(cwd, custom);
  }
  return path.resolve(cwd, 'private_uploads');
}

export function getCookieSecurityOptions(isHttps: boolean): {
  httpOnly: true;
  sameSite: 'none' | 'lax';
  secure: boolean;
  path: '/';
} {
  return {
    httpOnly: true,
    sameSite: isHttps ? 'none' : 'lax',
    secure: isHttps,
    path: '/',
  };
}
