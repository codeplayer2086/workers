import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

const uri = (process.env.DATABASE_URL || process.env.MYSQL_URL || '').trim();
const host = process.env.MYSQL_HOST || process.env.DB_HOST || '127.0.0.1';
const port = Number(process.env.MYSQL_PORT || process.env.DB_PORT || 3306);
const user = process.env.MYSQL_USER || process.env.DB_USER;
const password = process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD;
const database = process.env.MYSQL_DATABASE || process.env.DB_NAME;

if (!uri && (!user || !database)) {
  throw new Error('Set DATABASE_URL/MYSQL_URL or MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, and MYSQL_DATABASE.');
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: uri
    ? { url: uri }
    : {
        host,
        port,
        user: user!,
        password: password || '',
        database: database!,
      },
  verbose: true,
});
