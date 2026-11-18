import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema.ts';
import { resolveMysqlConfig } from '../lib/runtime-config.ts';

declare global {
  var _mysqlPool: mysql.Pool | undefined;
}

export const createPool = (): mysql.Pool => {
  if (!global._mysqlPool) {
    const cfg = resolveMysqlConfig(process.env);
    if (cfg.uri) {
      global._mysqlPool = mysql.createPool({
        uri: cfg.uri,
        waitForConnections: true,
        connectionLimit: 10,
        connectTimeout: 15000,
        charset: 'utf8mb4',
        ...(cfg.ssl ? { ssl: cfg.ssl } : {}),
      });
    } else {
      global._mysqlPool = mysql.createPool({
        host: cfg.host,
        port: cfg.port,
        user: cfg.user,
        password: cfg.password,
        database: cfg.database,
        waitForConnections: true,
        connectionLimit: 10,
        connectTimeout: 15000,
        charset: 'utf8mb4',
        ...(cfg.ssl ? { ssl: cfg.ssl } : {}),
      });
    }
  }
  return global._mysqlPool;
};

export const pool = createPool();
export const db = drizzle(pool, { schema, mode: 'default' });
